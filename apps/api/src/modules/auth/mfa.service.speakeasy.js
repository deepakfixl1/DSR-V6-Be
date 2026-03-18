/**
 * MFA Service using speakeasy, qrcode, and bcrypt
 * Enterprise-grade Multi-Factor Authentication
 * NO custom crypto - using industry-standard libraries
 */

import crypto from 'node:crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import MFADevice from '#db/models/MFADevice.model.js';
import User from '#db/models/User.model.js';
import AuditLog from '#db/models/AuditLog.model.js';
import { ApiError } from '#api/utils/ApiError.js';
import { logger } from '#api/utils/logger.js';
import { createNotification } from '#api/modules/notification/notification.service.js';
import {
  isUserLocked,
  incrementAttempts,
  resetAttempts,
  getLockTimeRemaining,
  storeMFAChallenge,
  getMFAChallenge,
  deleteMFAChallenge,
  getRateLimitStatus
} from './mfa.rate-limit.service.js';

const BCRYPT_ROUNDS = 12;
const MAX_DEVICE_ATTEMPTS = 5;
const DEVICE_LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const BACKUP_CODE_COUNT = 10;
const TOTP_WINDOW = 1; // ±30 seconds

/**
 * Calculate basic risk score for audit logging
 */
function calculateRiskScore(meta) {
  let score = 0;
  if (!meta.ip || meta.ip === 'unknown') score += 20;
  if (!meta.userAgent) score += 10;
  return Math.min(score, 100);
}

/**
 * Log MFA audit event
 */
async function logMFAAudit(params) {
  try {
    await AuditLog.create({
      tenantId: params.tenantId,
      userId: params.userId,
      action: params.action,
      resourceType: 'MFADevice',
      resourceId: params.resourceId || null,
      ip: params.ip || 'unknown',
      userAgent: params.userAgent || null,
      metadata: {
        ...params.metadata,
        riskScore: calculateRiskScore({ ip: params.ip, userAgent: params.userAgent })
      }
    });
  } catch (error) {
    logger.error('Failed to log MFA audit event', { error: error.message, action: params.action });
  }
}

/**
 * Generate backup codes (alphanumeric, formatted)
 */
function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(6);
    const code = bytes.toString('base64')
      .replace(/[^A-Za-z0-9]/g, '')
      .substring(0, 12)
      .toUpperCase();
    const formatted = `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}`;
    codes.push(formatted);
  }
  return codes;
}

/**
 * Check if user has any verified MFA devices
 */
export async function hasVerifiedMFA(userId, tenantId) {
  const device = await MFADevice.findOne({
    tenantId,
    userId,
    verifiedAt: { $ne: null },
    revokedAt: null
  }).lean();
  
  return !!device;
}

/**
 * Setup TOTP - Generate secret and return QR code
 * POST /auth/mfa/setup
 */
export async function setupTOTP({ userId, tenantId, email, deviceName, meta }) {
  // Check if user already has a verified TOTP device
  const existingDevice = await MFADevice.findOne({
    tenantId,
    userId,
    type: 'totp',
    verifiedAt: { $ne: null },
    revokedAt: null
  }).lean();
  
  if (existingDevice) {
    throw ApiError.badRequest('TOTP is already enabled. Disable it first to set up a new device.');
  }
  
  // Generate TOTP secret using speakeasy
  const secret = speakeasy.generateSecret({
    name: `YourApp (${email})`,
    issuer: 'YourApp',
    length: 32
  });
  
  // Create unverified device
  const device = await MFADevice.create({
    tenantId,
    userId,
    type: 'totp',
    secret: secret.base32, // Store base32 secret
    name: deviceName || 'Authenticator App',
    verifiedAt: null,
    attempts: 0
  });
  
  // Generate QR code
  const qrCodeDataURL = await QRCode.toDataURL(secret.otpauth_url);
  
  await logMFAAudit({
    tenantId,
    userId,
    action: 'MFA_SETUP_INITIATED',
    resourceId: device._id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: { deviceType: 'totp', deviceName }
  });
  
  logger.info('TOTP setup initiated', { userId, tenantId, deviceId: device._id });
  
  return {
    deviceId: device._id,
    qrCode: qrCodeDataURL,
    manualEntryKey: secret.base32 // For manual entry
  };
}

/**
 * Verify TOTP setup - Confirm code and enable MFA
 * POST /auth/mfa/verify-setup
 */
export async function verifyTOTPSetup({ userId, tenantId, code, meta }) {
  const device = await MFADevice.findOne({
    tenantId,
    userId,
    type: 'totp',
    verifiedAt: null, // Unverified only
    revokedAt: null
  });
  
  if (!device) {
    throw ApiError.notFound('MFA setup not found. Please initiate setup first.');
  }
  
  if (device.verifiedAt) {
    throw ApiError.badRequest('Device is already verified');
  }
  
  // Check device lock
  if (device.lockedUntil && new Date(device.lockedUntil) > new Date()) {
    const remainingSeconds = Math.ceil((new Date(device.lockedUntil) - new Date()) / 1000);
    throw ApiError.badRequest(`Device is locked. Try again in ${remainingSeconds} seconds.`);
  }
  
  // Verify TOTP code using speakeasy
  const isValid = speakeasy.totp.verify({
    secret: device.secret,
    encoding: 'base32',
    token: code,
    window: TOTP_WINDOW
  });
  
  if (!isValid) {
    // Increment attempts
    device.attempts = (device.attempts || 0) + 1;
    
    // Lock device if max attempts exceeded
    if (device.attempts >= MAX_DEVICE_ATTEMPTS) {
      device.lockedUntil = new Date(Date.now() + DEVICE_LOCK_DURATION_MS);
    }
    
    await device.save();
    
    await logMFAAudit({
      tenantId,
      userId,
      action: 'MFA_VERIFICATION_FAILED',
      resourceId: device._id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: { deviceType: 'totp', attempts: device.attempts }
    });
    
    throw ApiError.badRequest('Invalid verification code');
  }
  
  // Mark device as verified
  device.verifiedAt = new Date();
  device.lastUsedAt = new Date();
  device.attempts = 0;
  device.lockedUntil = null;
  
  // Generate backup codes
  const backupCodes = generateBackupCodes(BACKUP_CODE_COUNT);
  const hashedCodes = await Promise.all(
    backupCodes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS))
  );
  
  // Store hashed backup codes in the same device
  device.backupCodesHashed = hashedCodes;
  await device.save();
  
  await logMFAAudit({
    tenantId,
    userId,
    action: 'MFA_ENABLED',
    resourceId: device._id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: { deviceType: 'totp', backupCodesGenerated: BACKUP_CODE_COUNT }
  });
  
  // Send notification
  await createNotification({
    userId,
    tenantId,
    type: 'security',
    title: 'Two-Factor Authentication Enabled',
    body: 'MFA has been successfully enabled on your account.',
    priority: 'high'
  }).catch(err => logger.warn('Failed to send MFA notification', { error: err.message }));
  
  logger.info('TOTP verified and MFA enabled', { userId, tenantId, deviceId: device._id });
  
  return {
    success: true,
    backupCodes, // Return ONCE for user to save
    message: 'MFA enabled successfully. Save your backup codes in a secure location.'
  };
}

/**
 * Create MFA challenge during login
 */
export async function createMFAChallenge({ userId, tenantId, meta }) {
  const challengeId = crypto.randomUUID();
  
  await storeMFAChallenge(challengeId, {
    userId,
    tenantId,
    createdAt: new Date().toISOString(),
    ip: meta?.ip,
    userAgent: meta?.userAgent
  }, 300); // 5 minutes
  
  await logMFAAudit({
    tenantId,
    userId,
    action: 'MFA_CHALLENGE_CREATED',
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: { challengeId }
  });
  
  logger.info('MFA challenge created', { userId, tenantId, challengeId });
  
  return {
    challengeId,
    expiresIn: 300
  };
}

/**
 * Verify MFA code (TOTP or backup code)
 * POST /auth/mfa/verify
 */
export async function verifyMFACode({ challengeId, code, meta }) {
  // Retrieve challenge
  const challenge = await getMFAChallenge(challengeId);
  
  if (!challenge) {
    throw ApiError.badRequest('Invalid or expired MFA challenge');
  }
  
  const { userId, tenantId } = challenge;
  
  // Check rate limiting
  const isLocked = await isUserLocked(userId);
  if (isLocked) {
    const lockTime = await getLockTimeRemaining(userId);
    throw ApiError.badRequest(`Too many failed attempts. Try again in ${Math.ceil(lockTime / 60)} minutes.`);
  }
  
  // Get TOTP device
  const device = await MFADevice.findOne({
    tenantId,
    userId,
    type: 'totp',
    verifiedAt: { $ne: null },
    revokedAt: null
  });
  
  if (!device) {
    throw ApiError.badRequest('MFA is not enabled');
  }
  
  // Check device lock
  if (device.lockedUntil && new Date(device.lockedUntil) > new Date()) {
    await incrementAttempts(userId);
    throw ApiError.badRequest('MFA device is temporarily locked');
  }
  
  // Try TOTP verification first
  const isValidTOTP = speakeasy.totp.verify({
    secret: device.secret,
    encoding: 'base32',
    token: code,
    window: TOTP_WINDOW
  });
  
  if (isValidTOTP) {
    // Success - update device
    device.lastUsedAt = new Date();
    device.attempts = 0;
    device.lockedUntil = null;
    await device.save();
    
    // Reset rate limiting
    await resetAttempts(userId);
    
    // Delete challenge
    await deleteMFAChallenge(challengeId);
    
    await logMFAAudit({
      tenantId,
      userId,
      action: 'MFA_VERIFICATION_SUCCESS',
      resourceId: device._id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: { method: 'totp' }
    });
    
    logger.info('MFA verification successful (TOTP)', { userId, tenantId });
    
    return {
      success: true,
      method: 'totp',
      userId,
      tenantId
    };
  }
  
  // Try backup code verification
  if (device.backupCodesHashed && device.backupCodesHashed.length > 0) {
    for (let i = 0; i < device.backupCodesHashed.length; i++) {
      const isValidBackup = await bcrypt.compare(code, device.backupCodesHashed[i]);
      
      if (isValidBackup) {
        // Remove used backup code
        device.backupCodesHashed.splice(i, 1);
        device.lastUsedAt = new Date();
        device.attempts = 0;
        device.lockedUntil = null;
        await device.save();
        
        // Reset rate limiting
        await resetAttempts(userId);
        
        // Delete challenge
        await deleteMFAChallenge(challengeId);
        
        await logMFAAudit({
          tenantId,
          userId,
          action: 'MFA_BACKUP_CODE_USED',
          resourceId: device._id,
          ip: meta?.ip,
          userAgent: meta?.userAgent,
          metadata: { remainingCodes: device.backupCodesHashed.length }
        });
        
        // Send notification
        await createNotification({
          userId,
          tenantId,
          type: 'security',
          title: 'Backup Code Used',
          body: `A backup code was used to sign in. ${device.backupCodesHashed.length} codes remaining.`,
          priority: 'high'
        }).catch(err => logger.warn('Failed to send notification', { error: err.message }));
        
        logger.info('MFA verification successful (backup code)', { userId, tenantId, remainingCodes: device.backupCodesHashed.length });
        
        return {
          success: true,
          method: 'backup',
          userId,
          tenantId,
          remainingBackupCodes: device.backupCodesHashed.length
        };
      }
    }
  }
  
  // Failed verification - increment attempts
  await incrementAttempts(userId);
  
  device.attempts = (device.attempts || 0) + 1;
  
  if (device.attempts >= MAX_DEVICE_ATTEMPTS) {
    device.lockedUntil = new Date(Date.now() + DEVICE_LOCK_DURATION_MS);
    
    await logMFAAudit({
      tenantId,
      userId,
      action: 'MFA_DEVICE_LOCKED',
      resourceId: device._id,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
      metadata: { attempts: device.attempts }
    });
    
    // Send notification
    await createNotification({
      userId,
      tenantId,
      type: 'security',
      title: 'MFA Device Locked',
      body: 'Your MFA device has been temporarily locked due to multiple failed attempts.',
      priority: 'critical'
    }).catch(err => logger.warn('Failed to send notification', { error: err.message }));
  }
  
  await device.save();
  
  await logMFAAudit({
    tenantId,
    userId,
    action: 'MFA_VERIFICATION_FAILED',
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: { challengeId }
  });
  
  throw ApiError.badRequest('Invalid verification code');
}

/**
 * Disable MFA - Requires password and current MFA code
 * POST /auth/mfa/disable
 */
export async function disableMFA({ userId, tenantId, password, mfaCode, meta }) {
  // Verify password
  const user = await User.findById(userId).lean();
  if (!user) {
    throw ApiError.notFound('User not found');
  }
  
  const passwordHash = user.auth?.passwordHash || user.passwordHash;
  const isValidPassword = await bcrypt.compare(password, passwordHash);
  
  if (!isValidPassword) {
    throw ApiError.badRequest('Invalid password');
  }
  
  // Verify MFA code
  const device = await MFADevice.findOne({
    tenantId,
    userId,
    type: 'totp',
    verifiedAt: { $ne: null },
    revokedAt: null
  });
  
  if (!device) {
    throw ApiError.badRequest('MFA is not enabled');
  }
  
  const isValidMFA = speakeasy.totp.verify({
    secret: device.secret,
    encoding: 'base32',
    token: mfaCode,
    window: TOTP_WINDOW
  });
  
  if (!isValidMFA) {
    throw ApiError.badRequest('Invalid MFA code');
  }
  
  // Revoke device
  device.revokedAt = new Date();
  device.backupCodesHashed = []; // Clear backup codes
  await device.save();
  
  await logMFAAudit({
    tenantId,
    userId,
    action: 'MFA_DISABLED',
    resourceId: device._id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: {}
  });
  
  // Send notification
  await createNotification({
    userId,
    tenantId,
    type: 'security',
    title: 'Two-Factor Authentication Disabled',
    body: 'MFA has been disabled on your account.',
    priority: 'critical'
  }).catch(err => logger.warn('Failed to send notification', { error: err.message }));
  
  logger.info('MFA disabled', { userId, tenantId });
  
  return {
    success: true,
    message: 'MFA has been disabled successfully'
  };
}

/**
 * Get MFA status for user
 */
export async function getMFAStatus({ userId, tenantId }) {
  const device = await MFADevice.findOne({
    tenantId,
    userId,
    type: 'totp',
    verifiedAt: { $ne: null },
    revokedAt: null
  }).lean();
  
  const rateLimitStatus = await getRateLimitStatus(userId);
  
  return {
    enabled: !!device,
    device: device ? {
      id: device._id,
      type: device.type,
      name: device.name,
      verifiedAt: device.verifiedAt,
      lastUsedAt: device.lastUsedAt
    } : null,
    backupCodesRemaining: device?.backupCodesHashed?.length || 0,
    rateLimitStatus
  };
}

/**
 * Regenerate backup codes
 */
export async function regenerateBackupCodes({ userId, tenantId, mfaCode, meta }) {
  const device = await MFADevice.findOne({
    tenantId,
    userId,
    type: 'totp',
    verifiedAt: { $ne: null },
    revokedAt: null
  });
  
  if (!device) {
    throw ApiError.badRequest('MFA is not enabled');
  }
  
  const isValid = speakeasy.totp.verify({
    secret: device.secret,
    encoding: 'base32',
    token: mfaCode,
    window: TOTP_WINDOW
  });
  
  if (!isValid) {
    throw ApiError.badRequest('Invalid MFA code');
  }
  
  // Generate new backup codes
  const backupCodes = generateBackupCodes(BACKUP_CODE_COUNT);
  const hashedCodes = await Promise.all(
    backupCodes.map(code => bcrypt.hash(code, BCRYPT_ROUNDS))
  );
  
  device.backupCodesHashed = hashedCodes;
  await device.save();
  
  await logMFAAudit({
    tenantId,
    userId,
    action: 'MFA_BACKUP_CODES_REGENERATED',
    resourceId: device._id,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
    metadata: { count: BACKUP_CODE_COUNT }
  });
  
  logger.info('Backup codes regenerated', { userId, tenantId });
  
  return {
    success: true,
    backupCodes,
    message: 'New backup codes generated. Save them in a secure location.'
  };
}

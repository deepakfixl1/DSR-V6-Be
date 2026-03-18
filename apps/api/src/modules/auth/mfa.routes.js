/**
 * MFA Routes using speakeasy
 */

import { Router } from 'express';
import { validate } from '#api/middlewares/validate.middleware.js';
import { authenticate } from '#api/middlewares/auth.middleware.js';
import * as mfaController from './mfa.controller.js';
import {
  setupTOTPSchema,
  verifySetupSchema,
  verifyMFASchema,
  disableMFASchema,
  regenerateBackupCodesSchema,
} from './mfa.validation.js';

/**
 * @param {{ mfaController: typeof mfaController }} deps
 * @returns {import("express").Router}
 */

const router = Router();

// Public routes (no authentication required)
router.post('/verify', validate(verifyMFASchema), mfaController.verifyMFA);

// Protected routes (authentication required)
router.post('/setup', authenticate(), validate(setupTOTPSchema), mfaController.setupTOTP);
router.post('/verify-setup', authenticate(), validate(verifySetupSchema), mfaController.verifyTOTPSetup);
router.post('/disable', authenticate(), validate(disableMFASchema), mfaController.disableMFA);
router.get('/status', authenticate(), mfaController.getMFAStatus);
router.post('/backup-codes/regenerate', authenticate(), validate(regenerateBackupCodesSchema), mfaController.regenerateBackupCodes);

export default  router;


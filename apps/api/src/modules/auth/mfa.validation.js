/**
 * MFA Validation Schemas using Zod
 */

import { z } from 'zod';

export const setupTOTPSchema = z.object({
  body: z.object({
    deviceName: z.string().trim().min(1).max(100).optional(),
  }),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

export const verifySetupSchema = z.object({
  body: z.object({
    code: z.string().trim().regex(/^\d{6}$/, 'Code must be 6 digits'),
  }),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

export const verifyMFASchema = z.object({
  body: z.object({
    challengeId: z.string().uuid('Invalid challenge ID'),
    code: z.string().trim().min(6).max(20),
  }),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

export const disableMFASchema = z.object({
  body: z.object({
    password: z.string().min(8),
    mfaCode: z.string().trim().regex(/^\d{6}$/, 'MFA code must be 6 digits'),
  }),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

export const regenerateBackupCodesSchema = z.object({
  body: z.object({
    mfaCode: z.string().trim().regex(/^\d{6}$/, 'MFA code must be 6 digits'),
  }),
  params: z.object({}).optional().default({}),
  query: z.object({}).optional().default({}),
});

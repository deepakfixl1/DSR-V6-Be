/**
 * Admin security routes. Platform-level security config and metrics (admin only).
 *
 * GET  /admin/security/metrics       — audit-derived security counts
 * GET  /admin/security/policies      — get security policies
 * PUT  /admin/security/policies      — save security policies
 * GET  /admin/security/blocked-ips   — list blocked IPs
 * POST /admin/security/blocked-ips   — add blocked IP
 * DEL  /admin/security/blocked-ips/:id — remove blocked IP
 * GET  /admin/security/compliance    — get compliance config
 * PUT  /admin/security/compliance    — save compliance config
 */

import { Router } from 'express'
import { authenticate } from '#api/middlewares/auth.middleware.js'
import { requireAdmin } from '#api/middlewares/requireAdmin.middleware.js'
import * as ctrl from '#api/modules/admin/admin.security.controller.js'

export const createAdminSecurityRoutes = () => {
  const router = Router()
  router.use(authenticate(), requireAdmin())

  router.get('/metrics', ctrl.getMetrics)

  router.get('/policies', ctrl.getPolicies)
  router.put('/policies', ctrl.savePolicies)

  router.get('/blocked-ips', ctrl.getBlockedIps)
  router.post('/blocked-ips', ctrl.addBlockedIp)
  router.delete('/blocked-ips/:id', ctrl.removeBlockedIp)

  router.get('/compliance', ctrl.getCompliance)
  router.put('/compliance', ctrl.saveCompliance)

  return router
}

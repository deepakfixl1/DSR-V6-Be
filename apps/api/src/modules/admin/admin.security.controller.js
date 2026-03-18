/**
 * Admin security controller. Delegates to security service; no business logic here.
 */

import * as securityService from '#api/modules/admin/admin.security.service.js'

export async function getMetrics(req, res, next) {
  try {
    const data = await securityService.getSecurityMetrics()
    return res.status(200).json(data)
  } catch (e) { next(e) }
}

export async function getPolicies(req, res, next) {
  try {
    const data = await securityService.getPolicies()
    return res.status(200).json(data)
  } catch (e) { next(e) }
}

export async function savePolicies(req, res, next) {
  try {
    const { policies } = req.body
    if (!Array.isArray(policies)) {
      return res.status(400).json({ message: 'policies must be an array' })
    }
    await securityService.savePolicies(policies)
    return res.status(200).json({ ok: true })
  } catch (e) { next(e) }
}

export async function getBlockedIps(req, res, next) {
  try {
    const data = await securityService.getBlockedIps()
    return res.status(200).json(data)
  } catch (e) { next(e) }
}

export async function addBlockedIp(req, res, next) {
  try {
    const { ip, reason } = req.body
    if (!ip || !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip.trim())) {
      return res.status(400).json({ message: 'Invalid IP address' })
    }
    const entry = await securityService.addBlockedIp({ ip: ip.trim(), reason })
    return res.status(201).json(entry)
  } catch (e) { next(e) }
}

export async function removeBlockedIp(req, res, next) {
  try {
    await securityService.removeBlockedIp(req.params.id)
    return res.status(200).json({ ok: true })
  } catch (e) { next(e) }
}

export async function getCompliance(req, res, next) {
  try {
    const data = await securityService.getCompliance()
    return res.status(200).json(data)
  } catch (e) { next(e) }
}

export async function saveCompliance(req, res, next) {
  try {
    const { score, items, checklist } = req.body
    await securityService.saveCompliance({ score, items, checklist })
    return res.status(200).json({ ok: true })
  } catch (e) { next(e) }
}

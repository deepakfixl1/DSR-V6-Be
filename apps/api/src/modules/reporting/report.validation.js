/**
 * Report validation schemas using Zod
 */

import { z } from "zod";

export const reportValidation = {
  generateDSR: {
    body: z.object({
      date: z.string().optional()
    })
  },

  generateWeekly: {
    body: z.object({
      weekStart: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format"
      })
    })
  },

  generateMonthly: {
    body: z.object({
      monthStart: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format"
      })
    })
  },

  generateQuarterly: {
    body: z.object({
      quarterStart: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: "Invalid date format"
      })
    })
  },

  generateYearly: {
    body: z.object({
      year: z.number().int().min(2020).max(2100)
    })
  },

  exportReport: {
    body: z.object({
      format: z.enum(["PDF", "CSV", "JSON"]).optional()
    })
  }
};

import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

export const listTicketsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
    search: z.string().optional(),
  }).optional(),
});

export const getTicketByIdSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
});

export const createTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(1).max(200).trim(),
    tenant: z.string().min(1).max(128).trim(),
    requester: z.string().email().toLowerCase().trim(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional().default("medium"),
    initialMessage: z.string().max(5000).optional(),
  }),
});

export const updateTicketSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    status: z.enum(["open", "in_progress", "resolved", "closed"]).optional(),
    assignee: z.string().max(128).nullable().optional(),
    priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  }).strict(),
});

export const addMessageSchema = z.object({
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    text: z.string().min(1).max(5000).trim(),
    internal: z.boolean().optional().default(false),
  }).strict(),
});


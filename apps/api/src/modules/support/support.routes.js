import { Router } from "express";
import { validate } from "#api/middlewares/validate.middleware.js";
import { authenticate } from "#api/middlewares/auth.middleware.js";
import { requireAdmin } from "#api/middlewares/requireAdmin.middleware.js";
import {
  listTicketsSchema,
  getTicketByIdSchema,
  createTicketSchema,
  updateTicketSchema,
  addMessageSchema,
} from "#api/modules/support/support.validation.js";
import * as supportController from "#api/modules/support/support.controller.js";

export const createSupportRoutes = () => {
  const router = Router();

  router.use(authenticate(), requireAdmin());

  router.get("/tickets", validate(listTicketsSchema), supportController.listTickets);
  router.post("/tickets", validate(createTicketSchema), supportController.createTicket);
  router.get("/tickets/:id", validate(getTicketByIdSchema), supportController.getTicketById);
  router.patch("/tickets/:id", validate(updateTicketSchema), supportController.updateTicket);
  router.post("/tickets/:id/messages", validate(addMessageSchema), supportController.addMessage);

  return router;
};


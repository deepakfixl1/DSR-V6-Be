import * as supportService from "#api/modules/support/support.service.js";

export async function listTickets(req, res, next) {
  try {
    const q = req.validated?.query ?? {};
    const result = await supportService.listTickets(q);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getTicketById(req, res, next) {
  try {
    const { id } = req.validated.params;
    const ticket = await supportService.getTicketById(id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json(ticket);
  } catch (error) {
    return next(error);
  }
}

export async function createTicket(req, res, next) {
  try {
    const { body } = req.validated;
    const ticket = await supportService.createTicket(body, req.user.id);
    return res.status(201).json(ticket);
  } catch (error) {
    return next(error);
  }
}

export async function updateTicket(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { body } = req.validated;
    const ticket = await supportService.updateTicket(id, body);
    return res.status(200).json(ticket);
  } catch (error) {
    return next(error);
  }
}

export async function addMessage(req, res, next) {
  try {
    const { id } = req.validated.params;
    const { body } = req.validated;
    const ticket = await supportService.addMessage(id, body, "Support");
    return res.status(200).json(ticket);
  } catch (error) {
    return next(error);
  }
}


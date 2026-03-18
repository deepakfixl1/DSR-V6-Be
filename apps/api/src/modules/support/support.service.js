import mongoose from "mongoose";
import { Notification } from "#db/models/index.js";
import { ApiError } from "#api/utils/ApiError.js";

const TYPE = "support_ticket";

function toTicketDoc(n) {
  const payload = n.payload ?? {};
  return {
    id: n._id,
    subject: n.title,
    tenant: payload.tenant ?? payload.tenantName ?? "",
    requester: payload.requester ?? payload.requesterEmail ?? "",
    status: payload.status ?? "open",
    priority: payload.priority ?? n.priority ?? "medium",
    assignee: payload.assignee ?? null,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
    messages: payload.messages ?? [],
  };
}

export async function listTickets({ page = 1, limit = 20, status, priority, search } = {}) {
  const skip = (Math.max(1, page) - 1) * Math.max(1, Math.min(limit, 100));
  const actualLimit = Math.max(1, Math.min(limit, 100));

  const filter = { type: TYPE };
  if (status) filter["payload.status"] = status;
  if (priority) filter["payload.priority"] = priority;
  if (search && search.trim()) {
    const term = search.trim();
    filter.$or = [
      { title: { $regex: term, $options: "i" } },
      { "payload.tenant": { $regex: term, $options: "i" } },
      { "payload.tenantName": { $regex: term, $options: "i" } },
      { "payload.requester": { $regex: term, $options: "i" } },
      { "payload.requesterEmail": { $regex: term, $options: "i" } },
    ];
  }

  const [docs, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(actualLimit).lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    docs: docs.map(toTicketDoc),
    total,
    page: Math.max(1, page),
    limit: actualLimit,
    pages: Math.ceil(total / actualLimit),
  };
}

export async function getTicketById(id) {
  const doc = await Notification.findById(id).lean();
  if (!doc || doc.type !== TYPE) return null;
  return toTicketDoc(doc);
}

export async function createTicket({ subject, tenant, requester, priority = "medium", initialMessage }, createdByUserId) {
  const payload = {
    tenant,
    requester,
    status: "open",
    priority,
    assignee: null,
    messages: [],
  };
  if (initialMessage && initialMessage.trim()) {
    payload.messages.push({
      author: "Customer",
      text: initialMessage.trim(),
      time: new Date().toISOString(),
      internal: false,
    });
  }

  const n = await Notification.create({
    userId: new mongoose.Types.ObjectId(createdByUserId),
    scope: "global",
    type: TYPE,
    title: subject,
    body: null,
    link: "/support",
    priority: priority === "critical" ? "critical" : priority === "high" ? "high" : "normal",
    payload,
  });

  return toTicketDoc(n.toObject());
}

export async function updateTicket(id, patch) {
  const set = {};
  if (patch.status !== undefined) set["payload.status"] = patch.status;
  if (patch.assignee !== undefined) set["payload.assignee"] = patch.assignee;
  if (patch.priority !== undefined) {
    set["payload.priority"] = patch.priority;
    set["priority"] = patch.priority === "critical" ? "critical" : patch.priority === "high" ? "high" : "normal";
  }

  const updated = await Notification.findOneAndUpdate(
    { _id: id, type: TYPE },
    { $set: set },
    { new: true }
  ).lean();

  if (!updated) throw ApiError.notFound("Ticket not found");
  return toTicketDoc(updated);
}

export async function addMessage(id, { text, internal = false }, author = "Support") {
  const msg = {
    author,
    text,
    time: new Date().toISOString(),
    internal: !!internal,
  };

  const updated = await Notification.findOneAndUpdate(
    { _id: id, type: TYPE },
    { $push: { "payload.messages": msg } },
    { new: true }
  ).lean();

  if (!updated) throw ApiError.notFound("Ticket not found");
  return toTicketDoc(updated);
}


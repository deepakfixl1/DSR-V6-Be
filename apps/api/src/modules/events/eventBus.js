import { EventEmitter } from "node:events";
import { logger } from "#api/utils/logger.js";
import { getAiQueue, getMaintenanceQueue } from "./queues.js";

const bus = new EventEmitter();

export const emitEvent = (eventName, payload) => {
  bus.emit(eventName, payload);
};

export const onEvent = (eventName, handler) => {
  bus.on(eventName, handler);
};

export const registerDefaultHandlers = () => {
  onEvent("report.submitted", async ({ tenantId, reportId }) => {
    try {
      const aiQ = getAiQueue();
      if (!aiQ) { logger.warn("aiQueue not ready — skipping summarize_report"); return; }
      await aiQ.add("summarize_report", { tenantId, reportId });
    } catch (error) {
      logger.warn({ err: error, tenantId, reportId }, "Failed to enqueue summarize_report job");
    }
  });

  onEvent("blocker.created", async ({ tenantId, blockerId }) => {
    try {
      const mQ = getMaintenanceQueue();
      if (!mQ) { logger.warn("maintenanceQueue not ready — skipping check_blocker_sla"); return; }
      await mQ.add("check_blocker_sla", { tenantId, blockerId });
    } catch (error) {
      logger.warn({ err: error, tenantId, blockerId }, "Failed to enqueue check_blocker_sla job");
    }
  });
};

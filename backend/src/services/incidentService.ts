import { randomUUID } from "node:crypto";
import { Monitor } from "../types/monitor.js";
import { CheckResult } from "../types/checkResult.js";
import {
  createIncident,
  getOpenIncidentForMonitor,
  resolveIncident
} from "../repositories/incidentRepository.js";
import {
  sendDowntimeNotification,
  sendRecoveryNotification
} from "./notificationService.js";

export async function processMonitorStatusTransition(
  monitor: Monitor,
  previousStatus: string,
  checkResult: CheckResult
): Promise<void> {
  const currentStatus = checkResult.status;

  // Transition: UP/UNKNOWN -> DOWN
  if (currentStatus === "DOWN" && previousStatus !== "DOWN") {
    // Check if an open incident already exists to prevent duplicate creation
    const existingOpenIncident = await getOpenIncidentForMonitor(monitor.monitorId);
    if (!existingOpenIncident) {
      const incidentId = `inc_${randomUUID()}`;
      const now = new Date().toISOString();

      await createIncident({
        incidentId,
        monitorId: monitor.monitorId,
        monitorName: monitor.name,
        url: monitor.url,
        startedAt: now,
        status: "OPEN",
        cause: checkResult.error,
        httpStatus: checkResult.httpStatus
      });

      // Trigger SNS Alert
      await sendDowntimeNotification(
        monitor.name,
        monitor.url,
        checkResult.error,
        checkResult.httpStatus
      );
    }
  }

  // Transition: DOWN -> UP
  if (currentStatus === "UP" && previousStatus === "DOWN") {
    const openIncident = await getOpenIncidentForMonitor(monitor.monitorId);
    if (openIncident) {
      const resolvedAt = new Date().toISOString();
      const startTime = new Date(openIncident.startedAt).getTime();
      const endTime = new Date(resolvedAt).getTime();
      const durationSeconds = Math.round((endTime - startTime) / 1000);

      await resolveIncident(
        openIncident.incidentId,
        resolvedAt,
        durationSeconds
      );

      // Trigger Recovery Alert
      await sendRecoveryNotification(
        monitor.name,
        monitor.url,
        durationSeconds
      );
    }
  }
}

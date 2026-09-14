import { randomUUID } from "node:crypto";

import {
  ScheduledEvent
} from "aws-lambda";

import {
  getDueMonitors,
  updateMonitorAfterCheck
} from "../repositories/monitorRepository.js";

import {
  createCheckResult
} from "../repositories/checkResultRepository.js";

import {
  checkUrl
} from "../services/httpChecker.js";

import {
  validateMonitorUrl
} from "../utils/urlSecurity.js";

import {
  processMonitorStatusTransition
} from "../services/incidentService.js";

export async function handler(
  event: ScheduledEvent
): Promise<void> {

  console.log(
    "Monitor worker started",
    {
      eventTime: event.time
    }
  );

  const now = new Date().toISOString();

  const monitors = await getDueMonitors(now);

  console.log(
    `Found ${monitors.length} monitors due for checking`
  );

  for (const monitor of monitors) {
    const previousStatus = monitor.status;

    try {

      await validateMonitorUrl(monitor.url);

      const result = await checkUrl(
        monitor.url,
        monitor.method,
        monitor.timeout
      );

      const checkedAt = new Date().toISOString();

      const checkResult = {
        checkId: `check_${randomUUID()}`,
        monitorId: monitor.monitorId,
        status: result.status,
        httpStatus: result.httpStatus,
        responseTime: result.responseTime,
        error: result.error,
        checkedAt
      };

      await createCheckResult(checkResult);

      await processMonitorStatusTransition(
        monitor,
        previousStatus,
        checkResult
      );

      const nextCheckAt = new Date(
        Date.now() + monitor.interval * 60 * 1000
      ).toISOString();

      await updateMonitorAfterCheck(
        monitor.monitorId,
        result.status,
        nextCheckAt
      );

      console.log(
        "Monitor checked successfully",
        {
          monitorId: monitor.monitorId,
          status: result.status,
          httpStatus: result.httpStatus,
          responseTime: result.responseTime,
          nextCheckAt
        }
      );

    } catch (error) {

      console.error(
        "Failed to process monitor",
        {
          monitorId: monitor.monitorId,
          error
        }
      );

      const checkedAt = new Date().toISOString();

      const checkResult = {
        checkId: `check_${randomUUID()}`,
        monitorId: monitor.monitorId,
        status: "DOWN" as const,
        error:
          error instanceof Error
            ? error.message
            : "Unknown monitoring error",
        checkedAt
      };

      await createCheckResult(checkResult);

      await processMonitorStatusTransition(
        monitor,
        previousStatus,
        checkResult
      );

      const nextCheckAt = new Date(
        Date.now() + monitor.interval * 60 * 1000
      ).toISOString();

      await updateMonitorAfterCheck(
        monitor.monitorId,
        "DOWN",
        nextCheckAt
      );
    }
  }

  console.log("Monitor worker completed");
}
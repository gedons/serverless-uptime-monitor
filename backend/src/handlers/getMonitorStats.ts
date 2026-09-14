import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import { getOwnedMonitor } from "../repositories/monitorRepository.js";
import { getCheckHistoryByMonitorId } from "../repositories/checkResultRepository.js";
import { getIncidentsByMonitorId } from "../repositories/incidentRepository.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { getAuthenticatedUserId } from "../utils/auth.js";

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    let userId: string;
    try {
      userId = getAuthenticatedUserId(event);
    } catch (authErr: any) {
      return errorResponse(401, authErr.message || "Unauthorized");
    }

    const monitorId = event.pathParameters?.monitorId;

    if (!monitorId) {
      return errorResponse(400, "Monitor ID is required");
    }

    const monitor = await getOwnedMonitor(monitorId, userId);
    if (!monitor) {
      return errorResponse(404, "Monitor not found");
    }

    const history = await getCheckHistoryByMonitorId(monitorId, 100);
    const incidents = await getIncidentsByMonitorId(monitorId, 50);

    const checks = history.items;
    const totalChecks = checks.length;
    const successfulChecks = checks.filter((c) => c.status === "UP").length;
    const failedChecks = checks.filter((c) => c.status === "DOWN").length;

    const uptimePercentage =
      totalChecks > 0
        ? Math.round((successfulChecks / totalChecks) * 10000) / 100
        : 100;

    const responseTimes = checks
      .map((c) => c.responseTime)
      .filter((t): t is number => typeof t === "number");

    const averageResponseTime =
      responseTimes.length > 0
        ? Math.round(
            responseTimes.reduce((acc, curr) => acc + curr, 0) /
              responseTimes.length
          )
        : 0;

    const fastestResponseTime =
      responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const slowestResponseTime =
      responseTimes.length > 0 ? Math.max(...responseTimes) : 0;

    return successResponse(200, {
      monitorId,
      currentStatus: monitor.status,
      totalChecks,
      successfulChecks,
      failedChecks,
      uptimePercentage,
      averageResponseTime,
      fastestResponseTime,
      slowestResponseTime,
      totalIncidents: incidents.length,
      lastCheckedAt: checks[0]?.checkedAt || null
    });
  } catch (error) {
    console.error("Failed to get monitor stats:", error);
    return errorResponse(500, "Failed to get monitor stats");
  }
}

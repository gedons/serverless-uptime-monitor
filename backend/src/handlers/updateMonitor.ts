import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import {
  UpdateMonitorInput,
  HttpMethod
} from "../types/monitor.js";

import { updateMonitorService } from "../services/monitorService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { validateMonitorUrl } from "../utils/urlSecurity.js";
import { getAuthenticatedUserId } from "../utils/auth.js";

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

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

    if (!event.body) {
      return errorResponse(400, "Request body is required");
    }

    let body: UpdateMonitorInput;
    try {
      body = JSON.parse(event.body);
    } catch {
      return errorResponse(400, "Request body must contain valid JSON");
    }

    if (body.name !== undefined && (typeof body.name !== "string" || body.name.trim().length === 0)) {
      return errorResponse(400, "Monitor name cannot be empty");
    }

    if (body.url !== undefined) {
      if (typeof body.url !== "string" || !isValidUrl(body.url)) {
        return errorResponse(400, "A valid HTTP or HTTPS URL is required");
      }
      try {
        await validateMonitorUrl(body.url);
      } catch (err: any) {
        return errorResponse(400, err.message || "Invalid URL");
      }
    }

    if (body.method !== undefined) {
      const method = body.method as HttpMethod;
      if (method !== "GET" && method !== "HEAD") {
        return errorResponse(400, "Method must be GET or HEAD");
      }
    }

    if (body.interval !== undefined) {
      const allowedIntervals = [1, 5, 10, 15, 30, 60];
      if (!allowedIntervals.includes(body.interval)) {
        return errorResponse(400, "Invalid monitoring interval");
      }
    }

    if (body.timeout !== undefined) {
      const allowedTimeouts = [5, 10, 15, 30];
      if (!allowedTimeouts.includes(body.timeout)) {
        return errorResponse(400, "Invalid timeout");
      }
    }

    if (body.enabled !== undefined && typeof body.enabled !== "boolean") {
      return errorResponse(400, "Enabled must be a boolean");
    }

    const updatedMonitor = await updateMonitorService(monitorId, userId, body);

    if (!updatedMonitor) {
      return errorResponse(404, "Monitor not found");
    }

    return successResponse(200, { monitor: updatedMonitor });
  } catch (error) {
    console.error("Failed to update monitor:", error);
    return errorResponse(500, "Failed to update monitor");
  }
}

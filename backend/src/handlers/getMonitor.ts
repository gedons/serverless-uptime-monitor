import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import { getMonitorService } from "../services/monitorService.js";
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

    const monitor = await getMonitorService(monitorId, userId);

    if (!monitor) {
      return errorResponse(404, "Monitor not found");
    }

    return successResponse(200, { monitor });
  } catch (error) {
    console.error("Failed to get monitor:", error);
    return errorResponse(500, "Failed to get monitor");
  }
}

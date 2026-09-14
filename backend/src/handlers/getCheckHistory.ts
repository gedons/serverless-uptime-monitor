import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import { getCheckHistoryService } from "../services/monitorService.js";
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

    const limitParam = event.queryStringParameters?.limit;
    let limit = 50;
    if (limitParam) {
      const parsed = parseInt(limitParam, 10);
      if (!isNaN(parsed) && parsed > 0) {
        limit = Math.min(parsed, 100);
      }
    }

    const nextToken = event.queryStringParameters?.nextToken;

    const result = await getCheckHistoryService(monitorId, userId, limit, nextToken);

    if (!result) {
      return errorResponse(404, "Monitor not found");
    }

    return successResponse(200, result);
  } catch (error: any) {
    console.error("Failed to get check history:", error);
    if (error.message?.includes("nextToken")) {
      return errorResponse(400, error.message);
    }
    return errorResponse(500, "Failed to get check history");
  }
}

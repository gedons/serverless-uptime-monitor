import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import { listMonitorsService } from "../services/monitorService.js";
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

    const monitors = await listMonitorsService(userId);

    return successResponse(200, {
      monitors,
      count: monitors.length
    });
  } catch (error) {
    console.error("Failed to list monitors:", error);
    return errorResponse(500, "Failed to list monitors");
  }
}

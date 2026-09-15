import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import {
  CreateMonitorInput,
  HttpMethod
} from "../types/monitor.js";

import {
  createMonitorService
} from "../services/monitorService.js";

import {
  successResponse,
  errorResponse
} from "../utils/response.js";

import {
  validateMonitorUrl
} from "../utils/urlSecurity.js";

import {
  getAuthenticatedUserId,
  getAuthenticatedUserEmail
} from "../utils/auth.js";

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" ||
      url.protocol === "http:"
    );
  } catch {
    return false;
  }
}

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {

  try {
    if (!event.body) {
      return errorResponse(
        400,
        "Request body is required"
      );
    }

    let body: CreateMonitorInput;

    try {
      body = JSON.parse(event.body);
    } catch {
      return errorResponse(
        400,
        "Request body must contain valid JSON"
      );
    }

    if (
      typeof body.name !== "string" ||
      body.name.trim().length === 0
    ) {
      return errorResponse(
        400,
        "Monitor name is required"
      );
    }

    if (
      typeof body.url !== "string" ||
      !isValidUrl(body.url)
    ) {
      return errorResponse(
        400,
        "A valid HTTP or HTTPS URL is required"
      );
    }

    const method: HttpMethod =
      body.method ?? "GET";

    if (method !== "GET" && method !== "HEAD") {
      return errorResponse(
        400,
        "Method must be GET or HEAD"
      );
    }

    const interval =
      body.interval ?? 5;

    const allowedIntervals = [
      1,
      5,
      10,
      15,
      30,
      60
    ];

    if (!allowedIntervals.includes(interval)) {
      return errorResponse(
        400,
        "Invalid monitoring interval"
      );
    }

    const timeout =
      body.timeout ?? 10;

    const allowedTimeouts = [
      5,
      10,
      15,
      30
    ];

    if (!allowedTimeouts.includes(timeout)) {
      return errorResponse(
        400,
        "Invalid timeout"
      );
    }

    try {
      await validateMonitorUrl(body.url);
    } catch (urlErr: any) {
      return errorResponse(
        400,
        urlErr.message || "Invalid or private monitoring URL"
      );
    }

    let userId: string;
    let userEmail: string | undefined;
    try {
      userId = getAuthenticatedUserId(event);
      userEmail = getAuthenticatedUserEmail(event);
    } catch (authErr: any) {
      return errorResponse(401, authErr.message || "Unauthorized");
    }

    const monitor =
      await createMonitorService({
        userId,
        userEmail,
        name: body.name,
        url: body.url,
        method,
        interval,
        timeout
      });

    return successResponse(
      201,
      {
        monitor
      }
    );

  } catch (error) {

    console.error(
      "Failed to create monitor:",
      error
    );

    return errorResponse(
      500,
      "Failed to create monitor"
    );
  }
}
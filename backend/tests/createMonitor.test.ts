import { describe, it, expect } from "vitest";

process.env.MONITORS_TABLE_NAME = "test-monitors-table";
process.env.CHECK_RESULTS_TABLE_NAME = "test-check-results-table";

import { handler as createMonitorHandler } from "../src/handlers/createMonitor.js";
import { APIGatewayProxyEvent } from "aws-lambda";

function mockAuthEvent(body?: any): APIGatewayProxyEvent {
  return {
    body: body ? (typeof body === "string" ? body : JSON.stringify(body)) : null,
    requestContext: {
      authorizer: {
        claims: {
          sub: "user_test_sub_123"
        }
      }
    }
  } as unknown as APIGatewayProxyEvent;
}

describe("createMonitor Handler", () => {
  it("should return 401 when request is unauthenticated", async () => {
    const event = { body: JSON.stringify({ name: "Site", url: "https://example.com" }) } as APIGatewayProxyEvent;
    const response = await createMonitorHandler(event);
    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body).error).toContain("Unauthorized");
  });

  it("should return 400 when body is missing", async () => {
    const event = mockAuthEvent(null);
    const response = await createMonitorHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("Request body is required");
  });

  it("should return 400 when body JSON is invalid", async () => {
    const event = mockAuthEvent("invalid json");
    const response = await createMonitorHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe(
      "Request body must contain valid JSON"
    );
  });

  it("should return 400 when monitor name is missing", async () => {
    const event = mockAuthEvent({ url: "https://example.com" });
    const response = await createMonitorHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("Monitor name is required");
  });

  it("should return 400 when URL is invalid", async () => {
    const event = mockAuthEvent({ name: "My Website", url: "not-a-valid-url" });
    const response = await createMonitorHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe(
      "A valid HTTP or HTTPS URL is required"
    );
  });

  it("should return 400 when SSRF targets localhost", async () => {
    const event = mockAuthEvent({ name: "Local Service", url: "http://localhost/admin" });
    const response = await createMonitorHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toContain(
      "Monitoring private hosts is not allowed"
    );
  });

  it("should return 400 when interval is invalid", async () => {
    const event = mockAuthEvent({
      name: "My Website",
      url: "https://example.com",
      interval: 99
    });
    const response = await createMonitorHandler(event);
    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).error).toBe("Invalid monitoring interval");
  });
});

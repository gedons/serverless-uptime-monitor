import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkUrl } from "../src/services/httpChecker.js";

describe("httpChecker - URL Availability Checker", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should return UP for HTTP 200 OK responses", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200
    } as Response);

    const result = await checkUrl("https://example.com", "GET", 10);
    expect(result.status).toBe("UP");
    expect(result.httpStatus).toBe(200);
    expect(result.error).toBeUndefined();
  });

  it("should return DOWN for HTTP 500 Server Errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500
    } as Response);

    const result = await checkUrl("https://example.com", "GET", 10);
    expect(result.status).toBe("DOWN");
    expect(result.httpStatus).toBe(500);
  });

  it("should handle network failure gracefully and return DOWN", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("ENOTFOUND"));

    const result = await checkUrl("https://nonexistent.domain.xyz", "GET", 10);
    expect(result.status).toBe("DOWN");
    expect(result.error).toBe("ENOTFOUND");
  });
});

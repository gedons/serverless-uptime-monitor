import {
  CheckStatus
} from "../types/checkResult.js";

export interface HttpCheckResult {
  status: CheckStatus;
  httpStatus?: number;
  responseTime?: number;
  error?: string;
}

export async function checkUrl(
  url: string,
  method: "GET" | "HEAD",
  timeoutSeconds: number
): Promise<HttpCheckResult> {

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutSeconds * 1000);

  const start = performance.now();

  try {

    const response = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: "manual"
    });

    const responseTime = Math.round(
      performance.now() - start
    );

    const status: CheckStatus =
      response.ok ? "UP" : "DOWN";

    return {
      status,
      httpStatus: response.status,
      responseTime
    };

  } catch (error) {

    const responseTime = Math.round(
      performance.now() - start
    );

    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      return {
        status: "DOWN",
        responseTime,
        error: "Request timed out"
      };
    }

    return {
      status: "DOWN",
      responseTime,
      error:
        error instanceof Error
          ? error.message
          : "Unknown request error"
    };

  } finally {
    clearTimeout(timeout);
  }
}
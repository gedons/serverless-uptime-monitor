import { randomUUID } from "node:crypto";

import {
  CreateMonitorInput,
  UpdateMonitorInput,
  Monitor
} from "../types/monitor.js";
import { CheckResult } from "../types/checkResult.js";

import {
  createMonitor,
  getMonitorById,
  getOwnedMonitor,
  listMonitorsByUserId,
  updateMonitor,
  deleteMonitor,
  updateMonitorAfterCheck
} from "../repositories/monitorRepository.js";

import {
  createCheckResult,
  getCheckHistoryByMonitorId,
  deleteCheckResultsByMonitorId
} from "../repositories/checkResultRepository.js";
import { deleteIncidentsByMonitorId } from "../repositories/incidentRepository.js";

import { checkUrl } from "./httpChecker.js";
import { validateMonitorUrl } from "../utils/urlSecurity.js";

export async function createMonitorService(
  input: CreateMonitorInput & { userId: string }
): Promise<Monitor> {

  const now = new Date().toISOString();

  // Set nextCheckAt to current time so the scheduled worker picks it up immediately
  const nextCheckAt = now;

  const monitor: Monitor = {
    monitorId: `mon_${randomUUID()}`,
    userId: input.userId,
    userEmail: input.userEmail,
    name: input.name.trim(),
    url: input.url.trim(),
    method: input.method ?? "GET",
    interval: input.interval ?? 5,
    timeout: input.timeout ?? 10,
    enabled: true,
    status: "UNKNOWN",
    nextCheckAt,
    createdAt: now,
    updatedAt: now
  };

  await createMonitor(monitor);

  return monitor;
}

export async function getMonitorService(
  monitorId: string,
  userId: string
): Promise<Monitor | null> {
  return getOwnedMonitor(monitorId, userId);
}

export async function listMonitorsService(userId: string): Promise<Monitor[]> {
  return listMonitorsByUserId(userId);
}

export async function updateMonitorService(
  monitorId: string,
  userId: string,
  input: UpdateMonitorInput
): Promise<Monitor | null> {
  const existing = await getOwnedMonitor(monitorId, userId);
  if (!existing) {
    return null;
  }

  const updates: UpdateMonitorInput & { nextCheckAt?: string; status?: "UP" | "DOWN" | "UNKNOWN" } = {
    ...input
  };

  if (input.name !== undefined) {
    updates.name = input.name.trim();
  }

  if (input.url !== undefined) {
    updates.url = input.url.trim();
  }

  if (input.interval !== undefined && input.interval !== existing.interval) {
    updates.nextCheckAt = new Date(
      Date.now() + input.interval * 60 * 1000
    ).toISOString();
  }

  if (input.enabled === false) {
    updates.status = "UNKNOWN";
  } else if (input.enabled === true && !existing.enabled) {
    updates.nextCheckAt = new Date(
      Date.now() + (input.interval ?? existing.interval) * 60 * 1000
    ).toISOString();
  }

  return updateMonitor(monitorId, updates);
}

export async function deleteMonitorService(
  monitorId: string,
  userId: string
): Promise<boolean> {
  const existing = await getOwnedMonitor(monitorId, userId);
  if (!existing) {
    return false;
  }

  // Delete all associated check results & incidents from DynamoDB
  await Promise.allSettled([
    deleteCheckResultsByMonitorId(monitorId),
    deleteIncidentsByMonitorId(monitorId)
  ]);

  return deleteMonitor(monitorId);
}

export async function triggerManualCheckService(
  monitorId: string,
  userId: string
): Promise<{ monitor: Monitor; checkResult: CheckResult } | null> {
  const monitor = await getOwnedMonitor(monitorId, userId);
  if (!monitor) {
    return null;
  }

  let status: "UP" | "DOWN" = "DOWN";
  let httpStatus: number | undefined;
  let responseTime: number | undefined;
  let error: string | undefined;

  try {
    await validateMonitorUrl(monitor.url);
    const result = await checkUrl(monitor.url, monitor.method, monitor.timeout);
    status = result.status;
    httpStatus = result.httpStatus;
    responseTime = result.responseTime;
    error = result.error;
  } catch (err: any) {
    status = "DOWN";
    error = err instanceof Error ? err.message : "Manual check error";
  }

  const checkedAt = new Date().toISOString();
  const checkResult: CheckResult = {
    checkId: `check_${randomUUID()}`,
    monitorId: monitor.monitorId,
    status,
    httpStatus,
    responseTime,
    error,
    checkedAt
  };

  await createCheckResult(checkResult);

  const nextCheckAt = new Date(
    Date.now() + monitor.interval * 60 * 1000
  ).toISOString();

  await updateMonitorAfterCheck(monitor.monitorId, status, nextCheckAt);

  const updatedMonitor = await getMonitorById(monitorId);

  return {
    monitor: updatedMonitor ?? { ...monitor, status, nextCheckAt },
    checkResult
  };
}

export async function getCheckHistoryService(
  monitorId: string,
  userId: string,
  limit?: number,
  nextToken?: string
): Promise<{ items: CheckResult[]; nextToken?: string } | null> {
  const monitor = await getOwnedMonitor(monitorId, userId);
  if (!monitor) {
    return null;
  }

  let exclusiveStartKey: Record<string, any> | undefined;
  if (nextToken) {
    try {
      exclusiveStartKey = JSON.parse(
        Buffer.from(nextToken, "base64").toString("utf-8")
      );
    } catch {
      throw new Error("Invalid nextToken pagination token");
    }
  }

  return getCheckHistoryByMonitorId(monitorId, limit, exclusiveStartKey);
}
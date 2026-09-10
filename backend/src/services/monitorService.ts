import { randomUUID } from "node:crypto";

import {
  CreateMonitorInput,
  Monitor
} from "../types/monitor.js";

import {
  createMonitor
} from "../repositories/monitorRepository.js";

export async function createMonitorService(
  input: CreateMonitorInput
): Promise<Monitor> {

  const now = new Date().toISOString();

  const monitor: Monitor = {
    monitorId: `mon_${randomUUID()}`,
    name: input.name.trim(),
    url: input.url.trim(),
    method: input.method ?? "GET",
    interval: input.interval ?? 5,
    timeout: input.timeout ?? 10,
    enabled: true,
    status: "UNKNOWN",
    createdAt: now,
    updatedAt: now
  };

  await createMonitor(monitor);

  return monitor;
}
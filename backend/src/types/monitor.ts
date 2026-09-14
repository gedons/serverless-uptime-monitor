export type MonitorStatus = "UP" | "DOWN" | "UNKNOWN";

export type HttpMethod = "GET" | "HEAD";

export interface Monitor {
  monitorId: string;
  userId: string;
  name: string;
  url: string;
  method: HttpMethod;
  interval: number;
  timeout: number;
  enabled: boolean;
  status: MonitorStatus;
  nextCheckAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMonitorInput {
  name: string;
  url: string;
  userId?: string;
  method?: HttpMethod;
  interval?: number;
  timeout?: number;
}

export interface UpdateMonitorInput {
  name?: string;
  url?: string;
  method?: HttpMethod;
  interval?: number;
  timeout?: number;
  enabled?: boolean;
}
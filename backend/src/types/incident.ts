export type IncidentStatus = "OPEN" | "RESOLVED";

export interface Incident {
  incidentId: string;
  monitorId: string;
  monitorName: string;
  url: string;
  startedAt: string;
  resolvedAt?: string;
  durationSeconds?: number;
  status: IncidentStatus;
  cause?: string;
  httpStatus?: number;
}

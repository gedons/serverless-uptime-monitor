export type CheckStatus = "UP" | "DOWN";

export interface CheckResult {
  checkId: string;
  monitorId: string;
  status: CheckStatus;
  httpStatus?: number;
  responseTime?: number;
  error?: string;
  checkedAt: string;
}
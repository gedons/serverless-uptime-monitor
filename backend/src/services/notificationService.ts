import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({});
const topicArn = process.env.ALERT_TOPIC_ARN;

export async function sendDowntimeNotification(
  monitorName: string,
  url: string,
  error?: string,
  httpStatus?: number
): Promise<void> {
  if (!topicArn) {
    console.warn("ALERT_TOPIC_ARN is not configured, skipping downtime alert.");
    return;
  }

  const subject = `🚨 ALERT: ${monitorName} is DOWN`;
  const message = [
    `Monitor: ${monitorName}`,
    `URL: ${url}`,
    `Status: DOWN`,
    httpStatus ? `HTTP Status: ${httpStatus}` : null,
    error ? `Error: ${error}` : null,
    `Time: ${new Date().toISOString()}`
  ]
    .filter(Boolean)
    .join("\n");

  try {
    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: subject,
        Message: message
      })
    );
    console.log(`Downtime notification sent for ${monitorName}`);
  } catch (err) {
    console.error("Failed to send downtime notification:", err);
  }
}

export async function sendRecoveryNotification(
  monitorName: string,
  url: string,
  durationSeconds?: number
): Promise<void> {
  if (!topicArn) {
    console.warn("ALERT_TOPIC_ARN is not configured, skipping recovery alert.");
    return;
  }

  const durationStr = durationSeconds
    ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
    : "Unknown duration";

  const subject = `✅ RECOVERY: ${monitorName} is UP`;
  const message = [
    `Monitor: ${monitorName}`,
    `URL: ${url}`,
    `Status: UP (Recovered)`,
    `Outage Duration: ${durationStr}`,
    `Time: ${new Date().toISOString()}`
  ].join("\n");

  try {
    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Subject: subject,
        Message: message
      })
    );
    console.log(`Recovery notification sent for ${monitorName}`);
  } catch (err) {
    console.error("Failed to send recovery notification:", err);
  }
}

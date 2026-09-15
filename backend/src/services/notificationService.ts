import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({});

export async function sendDowntimeNotification(
  monitorName: string,
  url: string,
  userEmail?: string,
  error?: string,
  httpStatus?: number
): Promise<void> {
  if (!userEmail) {
    console.warn(`No user email associated with monitor ${monitorName}, skipping email alert.`);
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
    await sesClient.send(
      new SendEmailCommand({
        Source: userEmail,
        Destination: { ToAddresses: [userEmail] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: message } }
        }
      })
    );
    console.log(`Downtime email notification sent to ${userEmail} for ${monitorName}`);
  } catch (err) {
    console.error(`Failed to send downtime email to ${userEmail}:`, err);
  }
}

export async function sendRecoveryNotification(
  monitorName: string,
  url: string,
  userEmail?: string,
  durationSeconds?: number
): Promise<void> {
  if (!userEmail) {
    console.warn(`No user email associated with monitor ${monitorName}, skipping recovery alert.`);
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
    await sesClient.send(
      new SendEmailCommand({
        Source: userEmail,
        Destination: { ToAddresses: [userEmail] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: message } }
        }
      })
    );
    console.log(`Recovery email notification sent to ${userEmail} for ${monitorName}`);
  } catch (err) {
    console.error(`Failed to send recovery email to ${userEmail}:`, err);
  }
}

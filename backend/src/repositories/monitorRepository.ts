import {
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";

import { Monitor, UpdateMonitorInput } from "../types/monitor.js";

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

function getTableName(): string {
  const tableName = process.env.MONITORS_TABLE_NAME;
  if (!tableName) {
    throw new Error("MONITORS_TABLE_NAME environment variable is not configured");
  }
  return tableName;
}

export async function createMonitor(
  monitor: Monitor
): Promise<void> {
  await dynamoDb.send(
    new PutCommand({
      TableName: getTableName(),
      Item: monitor,
      ConditionExpression: "attribute_not_exists(monitorId)"
    })
  );
}

export async function getMonitorById(
  monitorId: string
): Promise<Monitor | null> {
  const result = await dynamoDb.send(
    new GetCommand({
      TableName: getTableName(),
      Key: {
        monitorId
      }
    })
  );

  return (result.Item as Monitor) ?? null;
}

export async function getOwnedMonitor(
  monitorId: string,
  userId: string
): Promise<Monitor | null> {
  const monitor = await getMonitorById(monitorId);
  if (!monitor) return null;
  if (monitor.userId !== userId) return null;
  return monitor;
}

export async function listMonitorsByUserId(
  userId: string
): Promise<Monitor[]> {
  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "UserMonitorsIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId
      },
      ScanIndexForward: false
    })
  );

  return (result.Items ?? []) as Monitor[];
}

export async function listMonitors(): Promise<Monitor[]> {
  const result = await dynamoDb.send(
    new ScanCommand({
      TableName: getTableName()
    })
  );

  return (result.Items ?? []) as Monitor[];
}

export async function getDueMonitors(
  now: string
): Promise<Monitor[]> {
  const result = await dynamoDb.send(
    new ScanCommand({
      TableName: getTableName(),
      FilterExpression:
        "enabled = :enabled AND nextCheckAt <= :now",
      ExpressionAttributeValues: {
        ":enabled": true,
        ":now": now
      }
    })
  );

  return (result.Items ?? []) as Monitor[];
}

export async function updateMonitor(
  monitorId: string,
  updates: UpdateMonitorInput & { nextCheckAt?: string; status?: "UP" | "DOWN" | "UNKNOWN" }
): Promise<Monitor | null> {
  const updateExpressions: string[] = ["#updatedAt = :updatedAt"];
  const expressionAttributeNames: Record<string, string> = {
    "#updatedAt": "updatedAt"
  };
  const expressionAttributeValues: Record<string, any> = {
    ":updatedAt": new Date().toISOString()
  };

  if (updates.name !== undefined) {
    updateExpressions.push("#name = :name");
    expressionAttributeNames["#name"] = "name";
    expressionAttributeValues[":name"] = updates.name;
  }

  if (updates.url !== undefined) {
    updateExpressions.push("#url = :url");
    expressionAttributeNames["#url"] = "url";
    expressionAttributeValues[":url"] = updates.url;
  }

  if (updates.method !== undefined) {
    updateExpressions.push("#method = :method");
    expressionAttributeNames["#method"] = "method";
    expressionAttributeValues[":method"] = updates.method;
  }

  if (updates.interval !== undefined) {
    updateExpressions.push("#interval = :interval");
    expressionAttributeNames["#interval"] = "interval";
    expressionAttributeValues[":interval"] = updates.interval;
  }

  if (updates.timeout !== undefined) {
    updateExpressions.push("#timeout = :timeout");
    expressionAttributeNames["#timeout"] = "timeout";
    expressionAttributeValues[":timeout"] = updates.timeout;
  }

  if (updates.enabled !== undefined) {
    updateExpressions.push("#enabled = :enabled");
    expressionAttributeNames["#enabled"] = "enabled";
    expressionAttributeValues[":enabled"] = updates.enabled;
  }

  if (updates.status !== undefined) {
    updateExpressions.push("#status = :status");
    expressionAttributeNames["#status"] = "status";
    expressionAttributeValues[":status"] = updates.status;
  }

  if (updates.nextCheckAt !== undefined) {
    updateExpressions.push("#nextCheckAt = :nextCheckAt");
    expressionAttributeNames["#nextCheckAt"] = "nextCheckAt";
    expressionAttributeValues[":nextCheckAt"] = updates.nextCheckAt;
  }

  const result = await dynamoDb.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: {
        monitorId
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(monitorId)",
      ReturnValues: "ALL_NEW"
    })
  );

  return (result.Attributes as Monitor) ?? null;
}

export async function updateMonitorAfterCheck(
  monitorId: string,
  status: "UP" | "DOWN",
  nextCheckAt: string
): Promise<void> {
  await dynamoDb.send(
    new UpdateCommand({
      TableName: getTableName(),
      Key: {
        monitorId
      },
      UpdateExpression:
        "SET #status = :status, nextCheckAt = :nextCheckAt, updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":nextCheckAt": nextCheckAt,
        ":updatedAt": new Date().toISOString()
      }
    })
  );
}

export async function deleteMonitor(
  monitorId: string
): Promise<boolean> {
  try {
    await dynamoDb.send(
      new DeleteCommand({
        TableName: getTableName(),
        Key: {
          monitorId
        },
        ConditionExpression: "attribute_exists(monitorId)"
      })
    );
    return true;
  } catch (error: any) {
    if (error.name === "ConditionalCheckFailedException") {
      return false;
    }
    throw error;
  }
}
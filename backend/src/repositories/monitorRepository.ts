import {
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

import { Monitor } from "../types/monitor.js";

const client = new DynamoDBClient({});

const dynamoDb = DynamoDBDocumentClient.from(client);

const tableName = process.env.MONITORS_TABLE_NAME;

if (!tableName) {
  throw new Error("MONITORS_TABLE_NAME environment variable is not configured");
}

export async function createMonitor(
  monitor: Monitor
): Promise<void> {
  await dynamoDb.send(
    new PutCommand({
      TableName: tableName,
      Item: monitor,
      ConditionExpression: "attribute_not_exists(monitorId)"
    })
  );
}
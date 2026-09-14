import {
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand
} from "@aws-sdk/lib-dynamodb";

import { CheckResult } from "../types/checkResult.js";

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

function getTableName(): string {
  const tableName = process.env.CHECK_RESULTS_TABLE_NAME;
  if (!tableName) {
    throw new Error(
      "CHECK_RESULTS_TABLE_NAME environment variable is not configured"
    );
  }
  return tableName;
}

export async function createCheckResult(
  checkResult: CheckResult
): Promise<void> {
  await dynamoDb.send(
    new PutCommand({
      TableName: getTableName(),
      Item: checkResult
    })
  );
}

export async function getCheckHistoryByMonitorId(
  monitorId: string,
  limit: number = 50,
  exclusiveStartKey?: Record<string, any>
): Promise<{ items: CheckResult[]; nextToken?: string }> {
  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: getTableName(),
      IndexName: "MonitorHistoryIndex",
      KeyConditionExpression: "monitorId = :monitorId",
      ExpressionAttributeValues: {
        ":monitorId": monitorId
      },
      ScanIndexForward: false, // Newest first
      Limit: Math.min(limit, 100),
      ExclusiveStartKey: exclusiveStartKey
    })
  );

  const items = (result.Items ?? []) as CheckResult[];
  const nextToken = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
    : undefined;

  return {
    items,
    nextToken
  };
}
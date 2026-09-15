import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand
} from "@aws-sdk/lib-dynamodb";

import { Incident } from "../types/incident.js";

const client = new DynamoDBClient({});
const dynamoDb = DynamoDBDocumentClient.from(client);

const tableName = process.env.INCIDENTS_TABLE_NAME;

export async function createIncident(incident: Incident): Promise<void> {
  if (!tableName) return;
  await dynamoDb.send(
    new PutCommand({
      TableName: tableName,
      Item: incident
    })
  );
}

export async function getOpenIncidentForMonitor(
  monitorId: string
): Promise<Incident | null> {
  if (!tableName) return null;

  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "MonitorIncidentsIndex",
      KeyConditionExpression: "monitorId = :monitorId",
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":monitorId": monitorId,
        ":status": "OPEN"
      },
      ScanIndexForward: false, // newest first
      Limit: 1
    })
  );

  const items = (result.Items ?? []) as Incident[];
  return items.length > 0 ? items[0] : null;
}

export async function resolveIncident(
  incidentId: string,
  resolvedAt: string,
  durationSeconds: number
): Promise<void> {
  if (!tableName) return;

  await dynamoDb.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        incidentId
      },
      UpdateExpression:
        "SET #status = :status, resolvedAt = :resolvedAt, durationSeconds = :durationSeconds",
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": "RESOLVED",
        ":resolvedAt": resolvedAt,
        ":durationSeconds": durationSeconds
      }
    })
  );
}

export async function getIncidentsByMonitorId(
  monitorId: string,
  limit: number = 20
): Promise<Incident[]> {
  if (!tableName) return [];

  const result = await dynamoDb.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: "MonitorIncidentsIndex",
      KeyConditionExpression: "monitorId = :monitorId",
      ExpressionAttributeValues: {
        ":monitorId": monitorId
      },
      ScanIndexForward: false,
      Limit: limit
    })
  );

  return (result.Items ?? []) as Incident[];
}

export async function deleteIncidentsByMonitorId(
  monitorId: string
): Promise<void> {
  if (!tableName) return;

  let lastEvaluatedKey: Record<string, any> | undefined;

  do {
    const queryResult = await dynamoDb.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: "MonitorIncidentsIndex",
        KeyConditionExpression: "monitorId = :monitorId",
        ExpressionAttributeValues: {
          ":monitorId": monitorId
        },
        ExclusiveStartKey: lastEvaluatedKey
      })
    );

    const items = queryResult.Items || [];
    lastEvaluatedKey = queryResult.LastEvaluatedKey;

    if (items.length > 0) {
      for (let i = 0; i < items.length; i += 25) {
        const batch = items.slice(i, i + 25);
        const deleteRequests = batch.map((item) => ({
          DeleteRequest: {
            Key: { incidentId: item.incidentId }
          }
        }));

        await dynamoDb.send(
          new BatchWriteCommand({
            RequestItems: {
              [tableName]: deleteRequests
            }
          })
        );
      }
    }
  } while (lastEvaluatedKey);
}

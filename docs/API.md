# REST API Specification — Serverless Uptime Monitor

**Base URL (Production):**
```
https://zwbk3hscmh.execute-api.eu-west-1.amazonaws.com/Prod
```

---

## Authentication

All endpoints require a valid Amazon Cognito **ID Token** in the `Authorization` header:

```
Authorization: Bearer <COGNITO_ID_TOKEN>
```

| Scenario | Response |
|---|---|
| Missing or invalid token | `401 Unauthorized` |
| Valid token, wrong user's resource | `404 Not Found` |
| Valid token, own resource | `200 / 201` as documented |

Tokens are obtained via Cognito `InitiateAuth` (username+password flow) or the Nuxt 3 frontend's auth composable. Tokens expire after 1 hour; use the refresh token to get a new ID token.

---

## Endpoints

### Monitors

#### `POST /monitors`
Create a new endpoint monitor.

**Request:**
```json
{
  "name": "Production API",
  "url": "https://api.example.com/health",
  "method": "GET",
  "interval": 5,
  "timeout": 10
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | ✅ | Display label |
| `url` | string | ✅ | Must be a valid HTTPS URL. Private IPs, loopbacks, and cloud metadata URLs are rejected (SSRF protection). |
| `method` | string | ✅ | `GET`, `POST`, `HEAD`, etc. |
| `interval` | number | ✅ | Check frequency in minutes (min: 1) |
| `timeout` | number | ✅ | Request timeout in seconds |

**Response `201 Created`:**
```json
{
  "monitor": {
    "monitorId": "mon_a1b2c3d4",
    "userId": "cognito-sub-uuid",
    "name": "Production API",
    "url": "https://api.example.com/health",
    "method": "GET",
    "interval": 5,
    "timeout": 10,
    "enabled": true,
    "status": "UNKNOWN",
    "nextCheckAt": "2026-09-15T14:05:00.000Z",
    "createdAt": "2026-09-15T14:00:00.000Z",
    "updatedAt": "2026-09-15T14:00:00.000Z"
  }
}
```

**Errors:**
- `400` — Missing required fields or SSRF-blocked URL
- `401` — Unauthenticated

---

#### `GET /monitors`
List all monitors for the authenticated user.

**Response `200 OK`:**
```json
{
  "monitors": [
    {
      "monitorId": "mon_a1b2c3d4",
      "name": "Production API",
      "url": "https://api.example.com/health",
      "status": "UP",
      "enabled": true,
      "interval": 5,
      "nextCheckAt": "2026-09-15T14:10:00.000Z"
    }
  ],
  "count": 1
}
```

---

#### `GET /monitors/{monitorId}`
Get a single monitor by ID.

**Response `200 OK`:** Full monitor object (same shape as create response).

**Errors:**
- `404` — Monitor not found or belongs to another user

---

#### `PATCH /monitors/{monitorId}`
Update monitor properties or toggle enabled state (pause/resume).

**Request** (all fields optional):
```json
{
  "name": "Renamed Monitor",
  "url": "https://new-url.example.com/health",
  "method": "HEAD",
  "interval": 10,
  "timeout": 15,
  "enabled": false
}
```

**Response `200 OK`:** Updated monitor object.

---

#### `DELETE /monitors/{monitorId}`
Permanently delete a monitor and **all associated check results and incidents** (cascade delete).

**Response `200 OK`:**
```json
{ "message": "Monitor deleted successfully" }
```

---

### Health Checks

#### `POST /monitors/{monitorId}/check`
Trigger an immediate, synchronous health check. Updates monitor status in real time.

**Response `200 OK`:**
```json
{
  "result": {
    "checkId": "chk_xyz123",
    "monitorId": "mon_a1b2c3d4",
    "status": "UP",
    "httpStatus": 200,
    "responseTime": 142,
    "checkedAt": "2026-09-15T14:08:00.000Z"
  }
}
```

---

#### `GET /monitors/{monitorId}/checks`
Retrieve paginated check history, sorted by `checkedAt` descending.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `limit` | number | 50 | Max results per page |
| `nextToken` | string | — | Pagination cursor from previous response |

**Response `200 OK`:**
```json
{
  "checks": [
    {
      "checkId": "chk_xyz123",
      "monitorId": "mon_a1b2c3d4",
      "status": "UP",
      "httpStatus": 200,
      "responseTime": 142,
      "checkedAt": "2026-09-15T14:08:00.000Z"
    }
  ],
  "count": 1,
  "nextToken": null
}
```

---

### Incidents

#### `GET /monitors/{monitorId}/incidents`
Retrieve the outage and recovery timeline for a monitor.

**Response `200 OK`:**
```json
{
  "incidents": [
    {
      "incidentId": "inc_abc987",
      "monitorId": "mon_a1b2c3d4",
      "status": "RESOLVED",
      "startedAt": "2026-09-15T12:00:00.000Z",
      "resolvedAt": "2026-09-15T12:15:00.000Z",
      "durationSeconds": 900
    },
    {
      "incidentId": "inc_def456",
      "monitorId": "mon_a1b2c3d4",
      "status": "OPEN",
      "startedAt": "2026-09-15T14:00:00.000Z",
      "resolvedAt": null,
      "durationSeconds": null
    }
  ],
  "count": 2
}
```

---

### Statistics

#### `GET /monitors/{monitorId}/stats`
Aggregated uptime and performance statistics.

**Response `200 OK`:**
```json
{
  "stats": {
    "monitorId": "mon_a1b2c3d4",
    "uptimePercent": 98.5,
    "totalChecks": 1440,
    "upChecks": 1418,
    "downChecks": 22,
    "avgResponseTime": 187,
    "minResponseTime": 89,
    "maxResponseTime": 2341,
    "totalIncidents": 3
  }
}
```

---

## Error Response Format

All error responses follow this shape:

```json
{
  "error": "Human-readable error message"
}
```

| Status Code | Meaning |
|---|---|
| `400 Bad Request` | Invalid input, missing fields, or SSRF-blocked URL |
| `401 Unauthorized` | Missing or invalid Cognito token |
| `403 Forbidden` | Token valid, action not permitted |
| `404 Not Found` | Resource doesn't exist or belongs to another user |
| `500 Internal Server Error` | Unexpected Lambda/AWS error |

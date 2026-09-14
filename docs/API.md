# Serverless Uptime Monitor - REST API Specification

Base URL (Local/Staging): `https://<api-id>.execute-api.eu-west-1.amazonaws.com/Prod`

---

## Authentication

All REST API endpoints require a valid Amazon Cognito JWT ID Token passed in the `Authorization` header:

```text
Authorization: Bearer <COGNITO_ID_TOKEN>
```

- Requests without a valid token return `401 Unauthorized`.
- Resources (monitors, check history, incidents, stats) are strictly scoped to the authenticated user (`claims.sub`). Attempting to access another user's monitor returns `404 Not Found`.

---

## Endpoints Summary

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/monitors` | Create a new endpoint monitor |
| `GET` | `/monitors` | List all configured monitors for the authenticated user |
| `GET` | `/monitors/{monitorId}` | Get details for a specific monitor (owned by user) |
| `PATCH` | `/monitors/{monitorId}` | Update or pause/resume a monitor |
| `DELETE` | `/monitors/{monitorId}` | Delete a monitor |
| `POST` | `/monitors/{monitorId}/check` | Manually trigger an immediate health check |
| `GET` | `/monitors/{monitorId}/checks` | Retrieve paginated check history |
| `GET` | `/monitors/{monitorId}/incidents` | Retrieve outage and recovery timeline |
| `GET` | `/monitors/{monitorId}/stats` | Retrieve aggregated uptime & response time statistics |

---

## Endpoint Details

### 1. POST /monitors
Creates a new uptime monitor. Automatically validates URL to prevent SSRF against private hostnames, loopbacks, and cloud metadata IPs.

**Request Body:**
```json
{
  "name": "Production API Gateway",
  "url": "https://api.example.com/health",
  "method": "GET",
  "interval": 5,
  "timeout": 10
}
```

**Response (201 Created):**
```json
{
  "monitor": {
    "monitorId": "mon_a1b2c3d4",
    "name": "Production API Gateway",
    "url": "https://api.example.com/health",
    "method": "GET",
    "interval": 5,
    "timeout": 10,
    "enabled": true,
    "status": "UNKNOWN",
    "nextCheckAt": "2026-09-14T13:05:00.000Z",
    "createdAt": "2026-09-14T13:00:00.000Z",
    "updatedAt": "2026-09-14T13:00:00.000Z"
  }
}
```

---

### 2. GET /monitors
Lists all monitors.

**Response (200 OK):**
```json
{
  "monitors": [ ... ],
  "count": 1
}
```

---

### 3. GET /monitors/{monitorId}
Returns a single monitor by ID.

---

### 4. PATCH /monitors/{monitorId}
Updates properties or toggles `enabled` state (Pause/Resume).

**Request Body:**
```json
{
  "enabled": false
}
```

---

### 5. DELETE /monitors/{monitorId}
Deletes a monitor record.

---

### 6. POST /monitors/{monitorId}/check
Triggers an immediate check and updates monitor status.

---

### 7. GET /monitors/{monitorId}/checks
Queries check history. Supports `limit` (default 50) and `nextToken` pagination.

---

### 8. GET /monitors/{monitorId}/incidents
Lists outages (`OPEN`) and resolved incidents with start time, resolution time, and outage duration.

---

### 9. GET /monitors/{monitorId}/stats
Computes uptime %, average latency, min/max response times, and total incidents.

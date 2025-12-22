# Uptime API Documentation

REST API untuk uptime monitoring service.

## Base URL

```
https://your-domain.com/api
```

---

## Endpoints

### Health Check

#### `GET /api/health`

Cek status API.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## Monitors

### `GET /api/monitors`

List semua monitors dengan statistik uptime.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Production API",
    "type": "https",
    "url": "https://api.example.com/health",
    "hostname": null,
    "port": null,
    "method": "GET",
    "expectedStatus": 200,
    "expectedBody": null,
    "dnsRecordType": null,
    "interval": 60,
    "timeout": 30,
    "retries": 0,
    "active": true,
    "maintenanceStart": null,
    "maintenanceEnd": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "latestHeartbeat": {
      "id": 100,
      "status": true,
      "statusCode": 200,
      "responseTime": 150,
      "message": null,
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    "uptime": 99.95,
    "avgResponseTime": 145
  }
]
```

### `GET /api/monitors/:id`

Ambil detail monitor.

**Response:**
```json
{
  "id": 1,
  "name": "Production API",
  "type": "https",
  "url": "https://api.example.com/health",
  "interval": 60,
  "timeout": 30,
  "retries": 0,
  "active": true,
  "notificationIds": [1, 2]
}
```

### `POST /api/monitors`

Create a new monitor.

**Request Body:**
```json
{
  "name": "My Website",
  "type": "https",
  "url": "https://example.com",
  "method": "GET",
  "expectedStatus": 200,
  "expectedBody": "OK",
  "headers": {
    "Authorization": "Bearer token123",
    "X-Custom-Header": "value"
  },
  "interval": 60,
  "timeout": 30,
  "retries": 1,
  "active": true,
  "notificationIds": [1, 2],
  "maintenanceStart": "2024-01-20T00:00:00.000Z",
  "maintenanceEnd": "2024-01-20T06:00:00.000Z"
}
```

**Monitor Types:**
| Type | Required Fields |
|------|-----------------|
| `http` | `url` |
| `https` | `url` |
| `tcp` | `hostname`, `port` |
| `dns` | `hostname`, `dnsRecordType` |

**DNS Record Types:** `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`

**Response (201):**
```json
{
  "id": 1,
  "name": "My Website",
  "type": "https",
  ...
}
```

### `PUT /api/monitors/:id`

Update monitor (partial update supported).

**Request Body:**
```json
{
  "name": "Updated Name",
  "interval": 120
}
```

### `DELETE /api/monitors/:id`

Hapus monitor.

**Response:**
```json
{
  "success": true
}
```

### `POST /api/monitors/:id/pause`

Pause monitoring.

**Response:**
```json
{
  "success": true
}
```

### `POST /api/monitors/:id/resume`

Resume monitoring.

**Response:**
```json
{
  "success": true
}
```

### `POST /api/monitors/test`

Test konfigurasi monitor tanpa menyimpan.

**Request Body:**
```json
{
  "type": "https",
  "url": "https://example.com",
  "method": "GET",
  "expectedStatus": 200,
  "timeout": 10
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "responseTime": 150,
  "message": null
}
```

---

## Heartbeats

### `GET /api/heartbeats/:monitorId`

Ambil heartbeats untuk monitor.

**Query Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `hours` | 24 | Rentang waktu dalam jam |
| `limit` | 100 | Maksimum jumlah hasil |

**Response:**
```json
[
  {
    "id": 100,
    "monitorId": 1,
    "status": true,
    "statusCode": 200,
    "responseTime": 150,
    "message": null,
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### `GET /api/heartbeats/:monitorId/stats`

Ambil statistik uptime (24h, 7d, 30d).

**Response:**
```json
{
  "last24h": {
    "uptime": 99.95,
    "avgResponseTime": 145,
    "totalChecks": 1440
  },
  "last7d": {
    "uptime": 99.80,
    "avgResponseTime": 150,
    "totalChecks": 10080
  },
  "last30d": {
    "uptime": 99.75,
    "avgResponseTime": 148,
    "totalChecks": 43200
  }
}
```

### `GET /api/heartbeats/:monitorId/incidents`

Ambil daftar incidents (downtime history).

**Response:**
```json
[
  {
    "id": 1,
    "monitorId": 1,
    "startedAt": "2024-01-10T08:00:00.000Z",
    "resolvedAt": "2024-01-10T08:15:00.000Z",
    "duration": 900,
    "cause": "Connection timeout"
  }
]
```

### `GET /api/heartbeats/:monitorId/hourly`

Ambil statistik per jam (aggregated).

**Query Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `days` | 7 | Rentang waktu dalam hari |

**Response:**
```json
[
  {
    "id": 1,
    "monitorId": 1,
    "hour": 1705312800000,
    "avgResponseTime": 145,
    "minResponseTime": 100,
    "maxResponseTime": 200,
    "uptimePercentage": 100,
    "checkCount": 60,
    "upCount": 60,
    "downCount": 0
  }
]
```

---

## Notifications

### `GET /api/notifications`

List semua notification channels.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Slack Alerts",
    "type": "slack",
    "config": {
      "webhookUrl": "https://hooks.slack.com/..."
    },
    "active": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

### `GET /api/notifications/:id`

Ambil detail notification.

### `POST /api/notifications`

Buat notification channel baru.

**Request Body:**
```json
{
  "name": "Discord Alerts",
  "type": "discord",
  "config": {
    "webhookUrl": "https://discord.com/api/webhooks/..."
  },
  "active": true
}
```

**Notification Types & Config:**

| Type | Config Fields |
|------|---------------|
| `webhook` | `url` |
| `discord` | `webhookUrl` |
| `slack` | `webhookUrl` |
| `telegram` | `botToken`, `chatId` |

**Response (201):**
```json
{
  "id": 1,
  "name": "Discord Alerts",
  "type": "discord",
  ...
}
```

### `PUT /api/notifications/:id`

Update notification (partial update supported).

### `DELETE /api/notifications/:id`

Hapus notification channel.

### `POST /api/notifications/:id/test`

Kirim test notification.

**Response:**
```json
{
  "success": true
}
```

---

## Status Pages

### `GET /api/status-pages/public/:slug`

Ambil status page publik (tidak perlu auth).

**Response:**
```json
{
  "id": 1,
  "slug": "my-company",
  "title": "My Company Status",
  "description": "System status for My Company services",
  "theme": "light",
  "published": true,
  "monitors": [
    {
      "id": 1,
      "name": "API",
      "status": true,
      "uptime": 99.95,
      "heartbeats": [
        {
          "status": true,
          "responseTime": 150,
          "createdAt": "2024-01-15T10:30:00.000Z"
        }
      ]
    }
  ]
}
```

### `GET /api/status-pages`

List semua status pages milik user.

### `GET /api/status-pages/:id`

Ambil detail status page.

### `POST /api/status-pages`

Buat status page baru.

**Request Body:**
```json
{
  "slug": "my-company",
  "title": "My Company Status",
  "description": "System status page",
  "theme": "light",
  "published": true,
  "monitorIds": [1, 2, 3]
}
```

**Themes:** `light`, `dark`, `auto`

### `PUT /api/status-pages/:id`

Update status page.

### `DELETE /api/status-pages/:id`

Hapus status page.

---

## Error Responses

Semua error menggunakan format yang konsisten:

```json
{
  "error": "Error message here"
}
```

**HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid auth |
| 404 | Not Found - Resource tidak ditemukan |
| 500 | Internal Server Error |

---

## Rate Limiting

Saat ini tidak ada rate limiting. Gunakan API secara bijak.

---

## Examples

### Bash/cURL

```bash
# List monitors
curl -H "x-api-key: up_xxx..." https://your-domain.com/api/monitors

# Create monitor
curl -X POST \
  -H "x-api-key: up_xxx..." \
  -H "Content-Type: application/json" \
  -d '{"name":"My Site","type":"https","url":"https://example.com"}' \
  https://your-domain.com/api/monitors

# Get uptime stats
curl -H "x-api-key: up_xxx..." \
  https://your-domain.com/api/heartbeats/1/stats
```

### JavaScript/TypeScript

```typescript
const API_KEY = 'up_xxx...';
const BASE_URL = 'https://your-domain.com/api';

async function getMonitors() {
  const res = await fetch(`${BASE_URL}/monitors`, {
    headers: { 'x-api-key': API_KEY }
  });
  return res.json();
}

async function createMonitor(data: { name: string; type: string; url: string }) {
  const res = await fetch(`${BASE_URL}/monitors`, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return res.json();
}
```

### Python

```python
import requests

API_KEY = "up_xxx..."
BASE_URL = "https://your-domain.com/api"

headers = {"x-api-key": API_KEY}

# List monitors
monitors = requests.get(f"{BASE_URL}/monitors", headers=headers).json()

# Create monitor
new_monitor = requests.post(
    f"{BASE_URL}/monitors",
    headers={**headers, "Content-Type": "application/json"},
    json={"name": "My Site", "type": "https", "url": "https://example.com"}
).json()
```

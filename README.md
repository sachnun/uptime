# Uptime

A self-hosted uptime monitoring tool inspired by Uptime Kuma, running on Cloudflare Workers.

## Features

- **HTTP/HTTPS Monitoring** - Check website availability and response times
- **TCP Monitoring** - Port connectivity checks using Cloudflare Sockets
- **DNS Monitoring** - DNS record verification via Cloudflare DoH
- **Cron-based Checks** - Automated monitoring every minute
- **Notifications** - Webhook, Discord, Telegram, Slack support
- **Status Pages** - Public status pages with customizable themes
- **Modern UI** - Vue 3 + TailwindCSS responsive dashboard

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vue 3 + Vite + TailwindCSS |
| Backend | Hono (Cloudflare Workers) |
| Database | Cloudflare D1 + Drizzle ORM |
| Scheduler | Cloudflare Cron Triggers |
| Auth | JWT (stateless) |

## Prerequisites

- Node.js 20+
- pnpm 8+
- Cloudflare account

## Setup

### 1. Clone and Install

```bash
git clone <repo-url> uptime
cd uptime
pnpm install
```

### 2. Create D1 Database

```bash
cd packages/api
pnpm wrangler d1 create uptime-db
```

Copy the database ID from the output and update `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "uptime-db",
      "database_id": "<YOUR_DATABASE_ID>"
    }
  ]
}
```

### 3. Run Migrations

```bash
pnpm wrangler d1 execute uptime-db --local --file=./drizzle/0000_init.sql
```

### 4. Development

Run both frontend and backend:

```bash
# Terminal 1 - API (packages/api)
cd packages/api
pnpm dev

# Terminal 2 - Web (packages/web)
cd packages/web
pnpm dev
```

Visit http://localhost:5173

### 5. Build and Deploy

```bash
# Build frontend
cd packages/web
pnpm build

# Deploy to Cloudflare
cd packages/api
pnpm deploy
```

## Configuration

### Environment Variables

Set these in `wrangler.jsonc` or via Cloudflare dashboard:

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT signing (change in production!) |

### Cron Schedule

Default: Every minute (`* * * * *`)

Modify in `wrangler.jsonc`:

```jsonc
{
  "triggers": {
    "crons": ["* * * * *"]
  }
}
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create admin account (first run only) |
| POST | `/api/auth/login` | Login and get JWT token |
| GET | `/api/monitors` | List all monitors |
| POST | `/api/monitors` | Create monitor |
| GET | `/api/monitors/:id` | Get monitor details |
| PUT | `/api/monitors/:id` | Update monitor |
| DELETE | `/api/monitors/:id` | Delete monitor |
| GET | `/api/heartbeats/:monitorId` | Get heartbeat history |
| GET | `/api/notifications` | List notifications |
| POST | `/api/notifications` | Create notification |
| GET | `/api/status-pages/public/:slug` | Public status page |

## Monitor Types

### HTTP/HTTPS
- URL to check
- HTTP method (GET, POST, etc.)
- Expected status code

### TCP
- Hostname
- Port
- Connection timeout

### DNS
- Hostname to resolve
- Record type (A, AAAA, CNAME, MX, TXT, NS)

## Notification Channels

### Webhook
```json
{
  "url": "https://your-webhook-url.com"
}
```

### Discord
```json
{
  "webhookUrl": "https://discord.com/api/webhooks/..."
}
```

### Telegram
```json
{
  "botToken": "123456:ABC-DEF...",
  "chatId": "-1001234567890"
}
```

### Slack
```json
{
  "webhookUrl": "https://hooks.slack.com/services/..."
}
```

## Limitations

- **No ICMP Ping** - Workers don't support raw sockets
- **Minimum 1-minute interval** - Cron trigger limitation
- **128MB memory limit** - Per worker invocation

## License

MIT

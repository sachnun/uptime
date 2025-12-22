# Uptime

Self-hosted uptime monitoring on [Cloudflare Workers](https://workers.cloudflare.com/). Inspired by [Uptime Kuma](https://github.com/louislam/uptime-kuma).

## Features

- **Multi-protocol Monitoring** — HTTP/HTTPS, TCP, DNS
- **Notifications** — [Discord](https://discord.com/developers/docs/resources/webhook), [Slack](https://api.slack.com/messaging/webhooks), [Telegram](https://core.telegram.org/bots/api), Webhook
- **Status Pages** — Public status pages with custom slugs
- **Modern Stack** — [Vue 3](https://vuejs.org/) + [Hono](https://hono.dev/) + [Drizzle ORM](https://orm.drizzle.team/)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | [Vue 3](https://vuejs.org/) + [Vite](https://vite.dev/) + [Tailwind CSS](https://tailwindcss.com/) |
| Backend | [Hono](https://hono.dev/) on [Cloudflare Workers](https://workers.cloudflare.com/) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) + [Drizzle ORM](https://orm.drizzle.team/) |
| Auth | JWT + OAuth ([GitHub](https://docs.github.com/en/apps/oauth-apps), [Google](https://developers.google.com/identity/protocols/oauth2)) |

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 8+
- [Cloudflare](https://dash.cloudflare.com/) account

### Installation

```bash
git clone https://github.com/your-username/uptime.git
cd uptime
pnpm install
```

### Database Setup

```bash
cd packages/api

# Create D1 database
pnpm wrangler d1 create uptime-db

# Update database_id in wrangler.jsonc, then run migrations
pnpm db:migrate
```

### Development

```bash
# Run both frontend and backend
pnpm dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787

### Deploy

```bash
pnpm deploy
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register (first user only) |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/monitors` | List monitors |
| `POST` | `/api/monitors` | Create monitor |
| `GET` | `/api/monitors/:id` | Get monitor |
| `PUT` | `/api/monitors/:id` | Update monitor |
| `DELETE` | `/api/monitors/:id` | Delete monitor |
| `GET` | `/api/status-pages/public/:slug` | Public status page |

## Monitor Types

| Type | Description |
|------|-------------|
| HTTP/HTTPS | URL availability, status codes, response time |
| TCP | Port connectivity via [Cloudflare Sockets](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) |
| DNS | Record verification via [Cloudflare DoH](https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/) |

## Limitations

- No ICMP ping (Workers limitation)
- Minimum 1-minute check interval ([Cron Triggers](https://developers.cloudflare.com/workers/configuration/cron-triggers/))
- 128MB memory per invocation

## License

[MIT](LICENSE)

# Uptime

Self-hosted uptime monitoring on [Cloudflare Workers](https://workers.cloudflare.com/). Inspired by [Uptime Kuma](https://github.com/louislam/uptime-kuma).

## Features

- **Multi-protocol Monitoring** — HTTP/HTTPS, TCP, DNS
- **Screenshots** — Auto-capture via [Browser Rendering](https://developers.cloudflare.com/browser-rendering/), stored on [imgbb](https://imgbb.com/)
- **Notifications** — [Discord](https://discord.com/developers/docs/resources/webhook), [Slack](https://api.slack.com/messaging/webhooks), [Telegram](https://core.telegram.org/bots/api), Webhook
- **Status Pages** — Public status pages with custom slugs

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

### Environment Variables

Set these secrets in Cloudflare Workers:

```bash
cd packages/api

# Required for OAuth
npx wrangler secret put GITHUB_CLIENT_SECRET
npx wrangler secret put GOOGLE_CLIENT_SECRET

# Required for notifications
npx wrangler secret put RESEND_API_KEY

# Optional: Enable screenshot capture
npx wrangler secret put IMGBB_API_KEY
```

Get your imgbb API key at https://api.imgbb.com/

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

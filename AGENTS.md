# Agent Guidelines

## Build Commands
- `pnpm install` - Install dependencies
- `pnpm dev` - Run all packages in dev mode
- `pnpm build` - Build all packages (runs vue-tsc + vite for web, wrangler for api)
- `pnpm db:generate` - Generate Drizzle migrations
- `pnpm db:migrate` - Apply migrations locally

## Project Structure
- `packages/api` - Cloudflare Workers API (Hono, Drizzle ORM, Zod)
- `packages/web` - Vue 3 frontend (Vite, Tailwind v4, Pinia, reka-ui)

## Code Style
- TypeScript strict mode, ES2022 target
- No comments in code - keep code clean and self-documenting
- Use const object mappings for lookups instead of if-else chains
- Early returns for validation/error cases
- camelCase for variables/functions, PascalCase for types/components
- Use Zod schemas for API validation (`zValidator` middleware)
- Imports: external first, then internal with `@/` alias (web) or relative (api)
- Vue: `<script setup lang="ts">` with `defineProps<T>()` syntax
- Prefer `Record<K, V>` over object literals in types

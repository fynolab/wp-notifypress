# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

Plugin repo only. Laravel app lives at `/Users/saimon/Documents/www/app.notifypress.com` — separate repo. When a change touches both, keep behavior aligned.

## Commands

```bash
# Install
composer install
pnpm install

# JS dev (watch)
pnpm run dev              # main admin UI only
pnpm run editor:dev       # Gutenberg editor bundle

# JS build (both required bundles)
pnpm run build

# Lint
pnpm run lint:js
pnpm run lint:css
pnpm run lint:php         # phpcs via composer
pnpm run typecheck        # tsc --noEmit

# Format
pnpm run format           # JS/CSS via wp-scripts
pnpm run format:php       # phpcbf via composer

# Package
pnpm run plugin-zip
```

Any change to `assets/src/` requires rebuilding **both** bundles (`pnpm run build`):
- `assets/main-dist` — wp-admin React SPA
- `assets/editor-dist` — Gutenberg sidebar only

## Architecture

### PHP — `src/`

Namespace: `Fynolab\NotifyPress`. PSR-4 autoloaded, Composer.

- `App` — bootstraps on `plugins_loaded`, iterates services via `notifypress_register_services` filter
- `Installer` — creates DB tables and options on activation
- `Assets` — enqueues the two JS bundles; holds `NONCE_ACTION` constant
- `Helpers.php` — global helper functions (autoloaded via composer `files`)

Services live in `src/Services/<Name>/`. Each must implement `Interfaces\Service` (one method: `static register(): void`). Current services:

| Service | Responsibility |
|---|---|
| `Menus` | Registers WP admin menu pages |
| `Settings` | REST API (`notifypress/v1/settings`) + option CRUD |
| `NotifyPress` | AJAX handlers: subscription updates, recent notifications proxy |
| `PWA` | Service worker manifest/registration |
| `NewPost` | Observer for new post publish events |
| `WC` | WooCommerce order + abandoned-cart notification observers (`Services/WC/`, `Services/WC/AbandonedCart/`) |

The Observer pattern (`Interfaces\Observer`) decouples event sources (WC, NewPost) from notification dispatch.

### JS/TS — `assets/src/`

React 18 + TypeScript + Tailwind CSS + `@wordpress/scripts` (webpack).

- `main.tsx` → admin SPA (React Router, TanStack Query, shadcn/ui components in `components/ui/`)
- `editor.ts` → Gutenberg panel for triggering notifications from post editor

API layer (`lib/api.ts`): all Laravel calls go through `laravelRequest()` / `laravelFetch()`. Uses `Bearer {apiToken}` auth. Visitor-context requests must include `notifypress-subscription-token` header (sourced from `localStorage['notifypress-SubscriptionToken']`).

Settings bootstrap is injected via PHP into `window` and read via `lib/settings.ts`.

## Key Conventions

- App URL never hardcoded — always read from `Settings::get('appUrl', Settings::DEFAULT_APP_URL)`
- `apiToken` and `apiKey` are kept in sync in the settings option; prefer `apiToken` in new code
- Cache read-only Laravel responses with `set_transient()`; never cache subscribe/unsubscribe mutations
- FCM push payload fields (`targetUrl`, etc.) must be strings — never `null`
- Multisite support: `Settings` uses `get_site_option`/`update_site_option` on multisite
- PHP minimum: 8.1 (`declare(strict_types=1)` on every file)
- WPCS rules enforced by `phpcs.xml.dist` (WordPress standard)

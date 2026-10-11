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

# Release
pnpm version:bump 1.1.2   # sets package.json, plugin header Version, readme Stable tag
pnpm version:check        # fails if those three disagree
pnpm run plugin-zip       # runs version:check, then builds notifypress-<version>.zip
```

`package.json` is the source of truth for the version. Add a `= x.y.z =` changelog entry to
`readme.txt` for each release (both commands warn when it is missing). Only the zip file is
versioned: it must still unzip to `notifypress/`, or WordPress installs it as a separate plugin
instead of updating this one.

Any change to `assets/src/` requires rebuilding **both** bundles (`pnpm run build`):
- `assets/main-dist` — wp-admin React SPA
- `assets/editor-dist` — block editor document panel only

The plugin ships no public-facing bundle: the opt-in prompt and recent-notifications panel are
served by the app (`{app}/widget.js?site_key=...`).

## Architecture

### PHP — `src/`

Namespace: `Fynolab\NotifyPress`. PSR-4 autoloaded, Composer.

- `App` — bootstraps on `plugins_loaded`, iterates services via `notifypress_register_services` filter
- `Installer` — creates DB tables and options on activation
- `Assets` — enqueues the three JS bundles; holds `NONCE_ACTION` constant
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
- `editor.ts` → block editor panel for composing the post's push notification (meta-backed; see docs/features.md)

API layer (`lib/api.ts`): all Laravel calls go through `laravelRequest()` / `laravelFetch()`. Uses `Bearer {apiToken}` auth. Visitor-context requests must include `notifypress-subscription-token` header (sourced from `localStorage['notifypress-SubscriptionToken']`).

Settings bootstrap is injected via PHP into `window` and read via `lib/settings.ts`.

## Key Conventions

- App URL is a constant, not a setting — `Api::APP_URL` / `Api::url()` in PHP, `lib/app.ts` (`APP_URL`, `API_URL`, `BILLING_URL`) in JS. Never hardcode the host anywhere else, and don't reintroduce an `appUrl` option or UI field.
- `apiToken` and `apiKey` are kept in sync in the settings option; prefer `apiToken` in new code
- Cache read-only Laravel responses with `set_transient()`; never cache subscribe/unsubscribe mutations
- FCM push payload fields (`targetUrl`, etc.) must be strings — never `null`
- Nothing this plugin builds loads on the public front end — keep it that way; public-side UI
  belongs in the app's `widget.js`, not in a bundle shipped from here
- Multisite support: `Settings` uses `get_site_option`/`update_site_option` on multisite
- PHP minimum: 8.1 (`declare(strict_types=1)` on every file)
- WPCS rules enforced by `phpcs.xml.dist` (WordPress standard)

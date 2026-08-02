# Architecture

This document covers the NotifyPress **WordPress plugin** — the site-side half of NotifyPress.
It is a thin client: it renders an admin SPA, embeds the widget/service worker on the public
site, and forwards subscriber/notification data to the NotifyPress **Laravel app**
(`app.notifypress.com`, separate repo), which owns all business logic, storage, and FCM delivery.

## Repo Boundary

| Repo | Owns |
|---|---|
| **This plugin** (`notifypress`) | WP admin SPA shell, REST proxy for settings, AJAX subscription/notification-fetch endpoints, WooCommerce/new-post event observers, PWA manifest/service worker |
| **Laravel app** (`app.notifypress.com`) | Subscribers, segments, notifications, automations, FCM delivery, analytics, billing |

The plugin never talks to Firebase or stores subscriber data itself — it authenticates to the
Laravel app's REST API (`/api/v1/...`) with a Bearer `apiToken` and relays requests. See
`app.notifypress.com/CLAUDE.md` → `docs/widget-sdk.md` and `docs/api.md` for the server side of
every contract described below.

**When a UI change is made in the Laravel app's admin dashboard, mirror it here** (and vice
versa) — component style, layout, and UX patterns are meant to stay in sync between the two
admin surfaces, per the app repo's CLAUDE.md.

## Bootstrap

`notifypress.php` checks the PHP version, defines path/URL constants (`SERVICE_DIR`,
`ASSETS_DIR`, `ASSETS_URL`, `NOTIFYPRESS_PLUGIN_FILE`), then requires the Composer autoloader and
calls `App::run()`.

`App` (`src/App.php`):
- Registers the activation hook → `Installer::run()` (currently just flags a setup-redirect
  option).
- On `activated_plugin`, redirects a non-network, non-AJAX activation straight to
  `admin.php?page=notifypress#/setup` unless `setupCompleted` is already true.
- On `plugins_loaded`, iterates a list of service classes (filterable via
  `notifypress_register_services`) and calls each one's static `register()`.

Services are self-contained feature modules under `src/Services/<Name>/`, each implementing
`Interfaces\Service` (single method: `static register(): void`). Current services:

| Service | Responsibility |
|---|---|
| `Menus` | Registers the top-level admin menu + hash-routed submenu items; renders the SPA shell page; handles setup redirect |
| `Settings` | Persists plugin settings as one option (`notifypress_settings`); exposes them via REST (`notifypress/v1/settings`, GET/POST; `notifypress/v1/post-types`, GET — public post types for the WordPress Events picker; both `manage_options`-gated) |
| `NotifyPress` | AJAX handlers used by the public widget: `notifypress_update_subscription`, `notifypress_get_recent_notifications` |
| `PWA` | Serves `/manifest.json` and injects PWA `<meta>`/icon tags when `pwaEnabled` |
| `NewPost` | Observer — notifies subscribers when a post is published |
| `WC` | No-op unless WooCommerce is active (`WC::is_active()` → `class_exists('WooCommerce')`); otherwise bootstraps two independent features: `OrderNotifications` (order-status observer) and `AbandonedCart\*` (cart tracking + hourly reminder cron) |

`Assets` (`src/Assets.php`, instantiated directly, not a `Service`) registers/enqueues the three
JS bundles, localizes `window.notifypress` bootstrap data, enqueues the public widget script from
`app.notifypress.com/widget.js?site_key=...`, and serves the bundled `/service-worker.js` via a
rewrite rule + `parse_request` hook (same pattern `PWA` uses for `/manifest.json`).

## Event → Notification Pattern (Observer)

Event-driven notification sources implement `Interfaces\Observer` (single method
`observe(): void`), which wires WP/plugin action hooks to methods that build a notification
payload and call `Notifier`. `NewPost` and `WC\OrderNotifications` are direct examples; `WC`
itself is a thin `Service::register()` wrapper that just bootstraps its sub-features (see
below).

```
WP/WC action fires
  → Observer method (e.g. WC\OrderNotifications::on_new_order)
    → builds payload { title, message, target_url }
      → Notifier::notify_subscriber(s)   [Abstracts\Notifier::send()]
        → POST {app}/api/v1/notifications/send  (Bearer apiKey)
```

`Abstracts\Notifier` (`src/Abstracts/Notifier.php`) centralizes the outbound call: resolves the
API endpoint/token from `Settings`, sanitizes the payload (`title`, `message`, `target_url`
kept as strings — never `null`, matching the app repo's FCM payload rule), and POSTs to the
Laravel app. `Interfaces\Notifier` defines the two static entry points
(`notify_subscriber`/`notify_subscribers`) implemented against this base.

To add a new event source: create an `Observer` implementation under `src/Services/<Name>/`
following `WC\OrderNotifications`, register (or wire it into an existing) `Service` class in
`App::get_services()` (or hook `notifypress_register_services`), and call
`Notifier::notify_subscriber(s)` from the observer.

### WooCommerce: Orders + Abandoned Cart

`WC::register()` bails immediately if WooCommerce isn't active (`WC::is_active()`) — no hooks
registered, no cron scheduled, `WC()`/`WC_Order` never touched. When it is, it bootstraps two
independent features, each with its own observer(s):

The frontend needs to know this too (to hide the Settings → WooCommerce tab on sites without
WooCommerce): `Settings::for_frontend()` adds a read-only `wooCommerceActive` flag — not a
persisted setting — on top of `Settings::all()`. It's used by **both** the REST endpoint
(`Rest\SettingsController`) and the PHP-localized script bootstrap (`Assets::register_scripts()`,
which seeds the frontend's `initialData` for the `np-settings` react-query cache — see
`assets/src/App.tsx`). Both call sites must use `for_frontend()`, not `Settings::all()` /
`SettingsRepository::all()` directly — the bootstrap seeds a 30s-stale-tolerant cache
(`staleTime: 30000` in `lib/query-client.ts`), so if only the REST endpoint carried the flag, the
UI would show wrong values for up to 30 seconds after every fresh page load.

- **`OrderNotifications`** (`src/Services/WC/OrderNotifications.php`) — the plain
  order-status-changed observer described above, gated by `wcOrderNotificationEnabled`.
- **`AbandonedCart\*`** (`src/Services/WC/AbandonedCart/`) — split into three collaborators
  composed by `AbandonedCart\AbandonedCart`:
  - `CartRepository` — the only class that touches storage; carts are transients
    (`notifypress_abandoned_cart_{identity}`), and "find all" scans `wp_options` by `LIKE` since
    there's no dedicated table.
  - `CartTracker` — snapshots `{subscriber_token, item_count, timestamp}` on
    `woocommerce_add_to_cart` (keyed by user ID or WC guest session ID; skipped entirely if the
    visitor has no known subscriber token), and clears the snapshot on `woocommerce_thankyou` so
    a completed checkout can't produce a stale reminder.
  - `AbandonedCartReminder` — the `notifypress_abandoned_cart_check` hourly cron handler; sends
    one reminder per cart older than an hour via `Notifier::notify_subscriber()`, then deletes
    the snapshot (one-shot).
  - `AbandonedCart` itself hooks `init` and `notifypress_settings_updated` to
    (un)schedule the reminder cron so it tracks the `wcAbandonedCartNotificationEnabled` setting
    live, rather than the cron running forever regardless of the toggle.

## Public Widget / Subscription Flow

The plugin does not implement the opt-in prompt or FCM registration itself — that logic lives in
`assets/global-dist`, a **build output of `app.notifypress.com`'s widget bundle served from the
Laravel app**, loaded via `Assets::enqueue_widget()` as an async `<script>` pointed at
`{app}/widget.js?site_key={siteKey}`. This plugin's own `global.ts` bundle is the thin glue
around it (public prompt UI wiring, kept intentionally lean since it loads on every page).

Subscription state changes flow through the plugin's own AJAX endpoints, not directly to the app,
so the plugin can attach its own nonce and manage the `apiKey`/cache server-side:

```
Visitor toggles subscription (widget UI)
  → wp_ajax(_nopriv)_notifypress_update_subscription
    → verify nonce (Assets::NONCE_ACTION)
    → POST {app}/api/v1/subscribers  (Bearer apiKey)
    → on activate: NotifyPress::maybe_send_welcome_notification_to()
        → WelcomeNotification::send()  [Settings-driven content, gated by welcomeNotificationEnabled]
          → Notifier::notify_subscriber()   [Abstracts\Notifier::send()]
```

`notifypress_get_recent_notifications` proxies `GET {app}/api/v1/notifications?status=sent`
and caches the response in a transient (`RECENT_NOTIFICATIONS_CACHE_TTL` = 2 min, keyed by
`md5(apiToken)`) — mutation endpoints (subscribe/unsubscribe) are never cached, matching
the app repo's caching convention.

`WelcomeNotification` (`src/Services/NotifyPress/WelcomeNotification.php`) is a plain class, not a
`Service` — it's only ever instantiated directly from `NotifyPress::maybe_send_welcome_notification_to()`,
never registered in `App::get_services()`. Its content (title/message/icon/URL) comes entirely from
`Settings` (`welcomeNotificationTitle`, `welcomeNotificationMessage`, `welcomeNotificationIcon`,
`welcomeNotificationUrl`) rather than a hardcoded template, and it's sent through the same shared
`Notifier` → `Abstracts\Notifier::send()` path as every other notification source, so it also
reaches the app through `Api::url()` rather than a URL of its own.

## Admin SPA

`Menus` registers one real admin page (`toplevel_page_notifypress`) plus several `add_submenu_page`
entries that all point at the same page callback — routing between them is client-side, via URL
hash (`#/dashboard`, `#/setup`, etc.), not separate PHP-rendered pages.

- `main.tsx` (`assets/main-dist`) — the admin SPA: React 18 + TypeScript + React Router +
  TanStack Query + Tailwind + shadcn/ui (`components/ui/`). Pages live in `assets/src/pages/`
  (`dashboard`, `notifications`, `subscribers`, `segments`, `automations` + its
  `templates`/`wizard`/`canvas`/`messages` variants, `analytics`, `reports`, `settings`, `setup`)
  — mirroring the Laravel app's Inertia page set.
- `editor.ts` (`assets/editor-dist`) — the block editor's document-sidebar panel for composing the
  post's push notification (opt-out, title/message, preview, test send); loaded for any user who
  can open the block editor, so it receives only the nonce/REST URL plus the non-sensitive
  `editor` bootstrap (site identity, field limits, global switches) — never `apiKey`/`apiToken`
  (enforced in `Assets::register_scripts()`).
- `global.ts` (`assets/global-dist`) — public-facing glue around the app-hosted widget bundle
  (see above).

Any change under `assets/src/` requires rebuilding all three (`pnpm run build`); they are
separate webpack entry points with very different size/permission constraints.

### Talking to the Laravel App from JS

`assets/src/lib/api.ts` is the single client for `{app}/api/v1/...` calls from the admin SPA
(`laravelRequest`/`laravelFetch`). It builds every URL from `API_URL` in `lib/app.ts` (see
**App URL** below), sends `Authorization: Bearer {apiToken}`, and
for visitor-context calls attaches a `notifypress-subscription-token` header sourced from
`localStorage['notifypress-SubscriptionToken']`. This is the same token issued to the widget when
a visitor subscribes.

## Settings

`Settings` (`src/Services/Settings/Settings.php`) is a thin `Service` facade — every other class
in the plugin talks to settings only through its static `Settings::get()`/`Settings::all()`, and
that surface is deliberately kept stable. It delegates to three collaborators under
`src/Services/Settings/`:

| Class | Responsibility |
|---|---|
| `SettingsRepository` | Storage: defaults, sanitization, persistence, and the invariants that apply on every update (see below) |
| `PostTypeOptions` | Reads the site's currently-public post types — used by both `SettingsRepository::sanitize()` (to validate) and `Rest\PostTypesController` (to list choices), so the two never drift |
| `Rest\SettingsController`, `Rest\PostTypesController` | REST endpoints only — request/response shape, `register_rest_route()` calls, permission checks. Both implement `Interfaces\RestController` (`register_routes(): void`), the REST counterpart to `Interfaces\Service`/`Interfaces\Observer` |

`Settings::__construct()` calls `SettingsRepository::ensure_defaults()` and hooks
`rest_api_init` to instantiate and register both REST controllers — it holds no storage or HTTP
logic itself.

`SettingsRepository` details:

- `defaults()` lists every known key; `all()` = `array_merge(defaults(), raw())`, so new keys
  added in code apply retroactively without a migration.
- `all()`/`ensure_defaults()`/`update()` all use a plain (shallow) `array_merge`, not
  `array_replace_recursive` — deliberately. `sanitize()` always returns a complete value for
  every key, including list-type settings like `postNotificationPostTypes`; `array_replace_recursive`
  merges numeric-indexed arrays by index rather than replacing them, which would leave stale
  trailing entries behind whenever such a list shrinks. If you add another list/array-valued
  setting, keep relying on this full-replace behavior rather than reintroducing recursive merging.
- `sanitize()` runs on every update — each field goes through a WP sanitizer
  (`sanitize_text_field`, `esc_url_raw`, `rest_sanitize_boolean`) before persisting; list-valued
  settings are additionally intersected against a live, authoritative set (`PostTypeOptions::public_names()`
  for `postNotificationPostTypes`) so stale or spoofed values can't be stored.
- `update()` (called by `Rest\SettingsController::update_settings()`, but storage-side so any
  future non-REST caller gets the same guarantees) owns the invariants: `apiToken` and `apiKey`
  are always kept identical (`apiKey` is a legacy alias; prefer `apiToken` in new code), a cleared
  `apiToken` resets `connectionStatus` to `disconnected` and clears `connectedSite`, toggling
  `pwaEnabled` calls `flush_rewrite_rules()` (the `/manifest.json` rewrite rule is only
  registered when the flag is on — see `PWA::__construct()`), and `notifypress_settings_updated`
  fires after every successful update for other services to hook into.

## App URL

The app lives at one fixed URL for every install, so it is a constant — not a setting, and not
user-editable:

| Side | Source of truth |
|---|---|
| PHP | `Fynolab\NotifyPress\Api` (`src/Api.php`) — `Api::APP_URL`, `Api::url( $path )` for `/api/v1/...`, `Api::widget_url( $site_key )` |
| JS | `assets/src/lib/app.ts` — `APP_URL`, `API_URL`, `BILLING_URL` |

Nothing else may hardcode the host: build URLs through those two modules only. The URL is
deliberately **not** in the localized `window.notifypress` bootstrap either — the bundle already
knows it.

It was briefly a stored setting (`appUrl`) with a text field on **Settings → Connect Your Site**.
Both are gone — the option key no longer exists in `defaults()`/`sanitize()`, so nothing a client
sends can repoint the plugin at another host.

## PWA

Gated entirely behind `Settings::get('pwaEnabled', false)` — when off, `PWA::__construct()`
registers nothing. When on: injects PWA `<meta>`/apple-touch-icon tags on `wp_head`, and serves
`/manifest.json` via the same rewrite-rule + `parse_request` pattern `Assets` uses for
`/service-worker.js`. Manifest fields (`app_name`, `theme_color`, `app_icon`, ...) live under
`Settings::all()['pwa']` and fall back to site identity (`get_bloginfo`, site icon) when unset.

## Conventions Recap

See the repo's `CLAUDE.md` for the full list; the architecturally load-bearing ones:

- Namespace `Fynolab\NotifyPress`, PSR-4, `declare(strict_types=1)` everywhere.
- Every feature module is a `Service` (`register(): void`) added to `App::get_services()`.
- Every event-driven notification source is an `Observer` calling `Notifier`.
- The API token is always read from `Settings`; the app URL never is — it comes from `Api`
  (PHP) / `lib/app.ts` (JS), and is hardcoded nowhere else.
- `global-dist` must stay minimal — it loads unconditionally on every public page.

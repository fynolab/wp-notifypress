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

`notifypress.php` checks the PHP version, defines path/URL constants (`NOTIFYPRESS_ASSETS_DIR`,
`NOTIFYPRESS_ASSETS_URL`, `NOTIFYPRESS_PLUGIN_FILE`), then requires the Composer autoloader and
calls `App::run()`.

`App` (`src/App.php`):
- Registers the activation hook → `Installer::run()` (currently just flags a setup-redirect
  option).
- The one-time redirect to `#/setup` happens on the next `admin_init` (see
  `Menus::maybe_redirect_to_setup` and docs/features.md → Guided Setup), not on
  `activated_plugin`.
- On `init` (priority 0), iterates a list of service classes (filterable via
  `notifypress_register_services`) and calls each one's static `register()`.

Services are self-contained feature modules under `src/Services/<Name>/`, each implementing
`Interfaces\Service` (single method: `static register(): void`). Current services:

| Service | Responsibility |
|---|---|
| `Menus` | Registers the top-level admin menu + hash-routed submenu items; renders the SPA shell page; handles setup redirect |
| `Settings` | Persists plugin settings as one option (`notifypress_settings`); exposes them via REST (`notifypress/v1/settings`, GET/POST; `notifypress/v1/post-types`, GET — public post types for the WordPress Events picker; both `manage_options`-gated) |
| `NotifyPress` | Registers the admin app-proxy REST controller (`notifypress/v1/proxy`), which attaches the site API token server-side |
| `PWA` | Serves `/manifest.json` and injects PWA `<meta>`/icon tags when `pwaEnabled` |
| `NewPost` | Observer — notifies subscribers when a post is published |
| `WC` | No-op unless WooCommerce is active (`WC::is_active()` → `class_exists('WooCommerce')`); otherwise bootstraps two independent features: `OrderNotifications` (order-status observer) and `AbandonedCart\*` (cart tracking + hourly reminder cron) |

`Assets` (`src/Assets.php`, instantiated directly, not a `Service`) registers/enqueues the two
admin JS bundles (`main`, `editor`), localizes `window.notifypress` bootstrap data, enqueues the
public widget script from
`app.notifypress.com/widget.js?site_key=...`, and serves the bundled worker at `/?notifypress_sw=1` from
a `parse_request` hook, passing that path to the widget.

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

`for_frontend()` also overlays the app's copy of the site record
(`Services\NotifyPress\CurrentSite`), because a few settings are owned by the app, not by WP:
`enable_geolocation`, `remove_powered_by` and the opt-in prompt fields can all be changed from the
NotifyPress dashboard, and the WP option only holds a copy refreshed when settings are saved here.
`CurrentSite::refresh()` runs once per NotifyPress admin page load (`Assets::register_scripts()`,
gated on the `toplevel_page_notifypress` hook suffix) and caches for a minute; everything else
reads `CurrentSite::cached()`, and an unreachable app just falls back to the stored copy. The
cache is flushed on `notifypress_settings_updated`, since saving PUTs the record to the app.
`Settings::all()` deliberately does **not** overlay — PHP consumers keep reading the persisted
option, and nothing about delivery depends on these two flags.

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

The plugin does not implement the opt-in prompt, the recent-notifications panel, or FCM
registration — all of it is served by the Laravel app and loaded via `Assets::enqueue_widget()`
as an async `<script>` pointed at `{app}/widget.js?site_key={siteKey}`. The plugin's only job on
the public side is enqueueing that tag with the site key, and only when `enabled` is on and a
site key is stored.

The widget is self-contained and talks to the app's **public** API directly — the plugin is not
in the request path at all:

```
Visitor toggles subscription (widget UI, served by the app)
  → POST {app}/api/v1/public/sites/{public_key}/subscribers
Panel opens
  → GET  {app}/api/v1/public/sites/{public_key}/notifications/recent
```

Those endpoints are unauthenticated by design (public key only, Origin-validated), which is why
the admin proxy deliberately excludes `public/*` from its allowlist.

The welcome notification and the widget's own copy/appearance are app-side concerns too, driven
by the `welcome_notification_*` and `prompt_*` keys on the site record — the plugin only writes
them through `PUT {app}/api/v1/sites/current` when the settings screen is saved.

> Earlier versions relayed subscribe/unsubscribe and the recent-notifications feed through the
> plugin's own `wp_ajax(_nopriv)_notifypress_*` handlers, backed by a `global.ts` prompt bundle
> and a `WelcomeNotification` class. All of that is gone — the app-served widget replaced it.

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
Both are admin-only. The plugin ships no public-facing bundle — the opt-in prompt and
recent-notifications panel come from the app's `widget.js` (see above).

Any change under `assets/src/` requires rebuilding both (`pnpm run build`); they are separate
webpack entry points with very different size/permission constraints.

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
`/manifest.json` via a rewrite rule + `parse_request` hook. Manifest fields (`app_name`, `theme_color`, `app_icon`, ...) live under
`Settings::all()['pwa']` and fall back to site identity (`get_bloginfo`, site icon) when unset.

## Conventions Recap

See the repo's `CLAUDE.md` for the full list; the architecturally load-bearing ones:

- Namespace `Fynolab\NotifyPress`, PSR-4, `declare(strict_types=1)` everywhere.
- Every feature module is a `Service` (`register(): void`) added to `App::get_services()`.
- Every event-driven notification source is an `Observer` calling `Notifier`.
- The API token is always read from `Settings`; the app URL never is — it comes from `Api`
  (PHP) / `lib/app.ts` (JS), and is hardcoded nowhere else.
- No plugin-built asset may load on the public front end; public-side UI belongs in the app's
  `widget.js`, which is enqueued as a plain external `<script>`.

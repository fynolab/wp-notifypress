# Features

A brief, per-feature rundown of what this plugin does and how. For the underlying class
structure and request flows, see [`architecture.md`](architecture.md).

## Admin Dashboard (SPA)

One real admin page (`toplevel_page_notifypress`, registered by `Menus`), with client-side
hash-routed sections — `#/dashboard`, `#/subscribers`, `#/segments`, `#/notifications`
("Campaigns"), `#/automations`, `#/analytics`, `#/reports`, `#/settings`. All of it is data
fetched live from the Laravel app (`app.notifypress.com`) via `lib/api.ts` — the plugin itself
stores no subscriber/campaign/analytics data, it's just the shell (`assets/main-dist`, React +
TanStack Query).

## Guided Setup

On first activation (`App::maybe_redirect_to_setup_after_activation`), the admin is redirected
straight to `#/setup` unless `setupCompleted` is already true. The wizard (`pages/setup.js`)
walks through connecting the site to a NotifyPress account and obtaining the `apiToken`/`siteKey`
pair that everything else depends on.

## Settings

Single options page (`Settings` service, REST-backed at `notifypress/v1/settings`) controlling:

- Connection (`apiToken`/`apiKey`, `siteKey`, `connectedSite`) — the app URL is **not** a setting;
  it is the `Api::APP_URL` constant (see Architecture → App URL)
- Global on/off (`enabled`)
- Welcome notification content and toggle: `welcomeNotificationEnabled`,
  `welcomeNotificationTitle`, `welcomeNotificationMessage`, `welcomeNotificationIcon`,
  `welcomeNotificationUrl`
- Per-source toggles: `postNotificationEnabled` (plus `postNotificationAllTypes`/
  `postNotificationPostTypes` to scope it to specific public post types), `wcOrderNotificationEnabled`,
  `wcAbandonedCartNotificationEnabled`
- Geolocation and "remove powered by" flags (mirrored from the connected site on the app side)
- `pwaEnabled`

Settings persist as one option (`notifypress_settings`, site option on multisite) and are
re-sanitized on every save.

## Subscription Widget (public site)

The actual opt-in prompt + FCM registration UI is loaded from the Laravel app
(`{app}/widget.js?site_key=...`, enqueued by `Assets::enqueue_widget()`) — this plugin doesn't
implement that UI itself. What the plugin does provide:

- **Subscribe/unsubscribe relay** — `wp_ajax(_nopriv)_notifypress_update_subscription` takes the
  widget's subscription token and forwards it to `{app}/api/v1/subscribers`, nonce-verified.
- **Welcome notification** — the moment a visitor's subscription is activated,
  `WelcomeNotification::send()` pushes a one-off notification to that subscriber only, built from
  the configurable `welcomeNotificationTitle`/`Message`/`Icon`/`Url` settings (with a sensible
  fallback message if left blank), sent via the same shared `Notifier` path as every other
  notification source. Gated by `welcomeNotificationEnabled` — see the **Settings → Welcome
  Message** tab.
- **Recent notifications feed** — `wp_ajax(_nopriv)_notifypress_get_recent_notifications` proxies
  `{app}/api/v1/notifications?status=sent&limit=3`, cached 2 minutes per API token
  (`set_transient`) so the public-facing feed doesn't hit the app API on every page load.

## Automatic Notifications (Observer pattern)

Each of these is a `Service` that wires a WordPress/plugin event to a push notification via
`Notifier::notify_subscriber(s)` → `{app}/api/v1/notifications/send`. Gated individually by a
`Settings` toggle where noted.

- **New Post** (`NewPost`) — on `transition_post_status` reaching `publish` for a public post
  type, notifies all subscribers with the post's notification title/message + permalink. Gated by
  `postNotificationEnabled`. By default fires for every public post type (including custom post
  types); toggling **Limit to specific post types** in Settings → WordPress Events restricts it
  to an explicit list (`postNotificationAllTypes: false` + `postNotificationPostTypes`, sourced
  from a `GET /notifypress/v1/post-types` REST endpoint listing the site's current public post
  types). What gets sent — and whether this particular post sends at all — comes from the
  post's own meta, edited in the block editor panel (see below) and resolved by
  `NewPost\PostNotification`. It also exposes a test-send AJAX action
  (`notifypress_send_test_notification`) that delivers to one subscriber only.
- **WooCommerce order placed** (`WC\OrderNotifications`) — on `woocommerce_order_status_changed`,
  notifies all subscribers with the order ID + view-order link. Gated by
  `wcOrderNotificationEnabled`.
- **WooCommerce abandoned cart** (`WC\AbandonedCart\*`) — see below.

Both WooCommerce features are entirely inactive on sites without the WooCommerce plugin —
`WC::register()` is a no-op unless `WC::is_active()`. The Settings → WooCommerce tab is hidden
accordingly (driven by a `wooCommerceActive` flag computed live, not stored).

## Abandoned Cart Reminders

Three collaborating classes under `WC\AbandonedCart\` (see `architecture.md` for the class
diagram):

1. **`CartTracker`** snapshots the cart (subscriber token, item count, timestamp) whenever a
   WooCommerce subscriber adds an item (`woocommerce_add_to_cart`), keyed by user ID or WC guest
   session ID. Carts with no known NotifyPress subscriber token aren't stored — there's nothing
   to notify. The snapshot is cleared on `woocommerce_thankyou`, so a completed checkout never
   triggers a reminder.
2. **`AbandonedCartReminder`** runs hourly (`notifypress_abandoned_cart_check` cron) and sends a
   reminder push to any snapshot older than one hour, then deletes it (one-shot — never resent).
3. **`AbandonedCart`** wires the two together and keeps the cron (un)scheduled to match the
   `wcAbandonedCartNotificationEnabled` setting, so toggling it off in Settings actually stops the
   cron rather than just skipping inside the handler.

## Block Editor Panel

`editor.ts` (`assets/editor-dist`) adds a **NotifyPress** panel to the block editor's document
sidebar (`editor/notification-panel.tsx`), below Publish/Visibility, where the author composes the
push notification the post will send:

- **Send Push Notification** — per-post opt-out (`_notifypress_send`). Global settings still win:
  a post opted in individually is not sent if post notifications are off site-wide or its post
  type is excluded, and the panel says so inline.
- **Notification title / message** (`_notifypress_title`, `_notifypress_message`) — blank means
  "use the post title / excerpt". Both are capped at the app's own limits (50 / 100 characters)
  and shown with a live character count.
- **Audience** — "Send to all subscribers" today; the app's send endpoint also accepts a
  `segment_id`, which is where segment targeting will slot in.
- **Notification preview** — the copy as subscribers will see it, framed as the editing browser's
  own notification chrome (browser name, title, message, site host).
- **Test notification** — posts to `notifypress_send_test_notification`, which delivers to a
  single subscriber: whoever this browser is, identified by the
  `notifypress-SubscriptionToken` the widget wrote to `localStorage`. Without that token the
  action refuses rather than falling back to a send-to-everyone.

Defaults, truncation, and the "does this post send?" decision live in
`NewPost\PostNotification` on the PHP side and are mirrored in `editor/post-notification.ts`, so
the preview matches what publishing actually sends. The meta keys are registered with
`show_in_rest` (and `custom-fields` support added where a post type lacks it) so the editor saves
them with the post — no separate save step.

The panel is loaded for anyone who can open the block editor, so its bootstrap carries only site
identity, field limits, and the two global switches — never the API token/key.

## PWA (Progressive Web App) Support

Opt-in via `pwaEnabled`. When on, `PWA` service:

- Injects PWA `<meta>` tags (viewport, theme-color, apple-mobile-web-app-*, apple-touch-icon,
  msapplication tiles) on `wp_head`.
- Serves `/manifest.json` (via a rewrite rule, same pattern as the service worker) built from
  `Settings::all()['pwa']` fields, falling back to site title/description/icon when unset.

## Service Worker

`Assets` serves the plugin's bundled `service-worker.js` at `/service-worker.js` via a rewrite
rule, required for the widget's push notifications and installability to work at the site root.

## Multisite

`Settings` transparently switches to `get_site_option`/`update_site_option` when
`is_multisite()`, so settings are network-wide rather than per-site — no separate code path
needed elsewhere.

## Not Yet Implemented / Known Gaps

- `WC\AbandonedCart` cart snapshots don't carry product names — the reminder message only
  reflects item count, not what's actually in the cart.
- Easy Digital Downloads support was removed (previously mis-wired to a WooCommerce hook); can be
  re-added later as its own `Service`/`Observer` pair following the `WC\OrderNotifications`
  pattern, hooked to a real EDD action (e.g. `edd_complete_purchase`).

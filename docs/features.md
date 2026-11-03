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

On the first admin page load after activation (`Menus::maybe_redirect_to_setup`, on
`admin_init`), the admin is redirected to `#/setup` **once**, unless `setupCompleted` is already
true or several plugins were bulk-activated (`activate-multi`). The flag is cleared before the
redirect, so the wizard never blocks the rest of wp-admin: an admin who leaves it can use
Plugins, Posts and so on, and finish setup later from the NotifyPress menu (the plugin's own
screens still route to `#/setup` until it is complete). Don't redirect from `activated_plugin`:
exiting there cuts bulk activation and `wp plugin activate` short. The wizard (`pages/setup.js`)
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
- Per-source toggles: `postNotificationEnabled` (plus `postNotificationPostTypes`, the post types
  it applies to), `wcOrderNotificationEnabled`, `wcAbandonedCartNotificationEnabled`
- Geolocation and "remove powered by" flags (mirrored from the connected site on the app side)
- `pwaEnabled`

Settings persist as one option (`notifypress_settings`, site option on multisite) and are
re-sanitized on every save.

## Subscription Widget (public site)

The whole public-side experience — opt-in prompt, recent-notifications panel, FCM registration —
is loaded from the Laravel app (`{app}/widget.js?site_key=...`, enqueued by
`Assets::enqueue_widget()` as an async script). The plugin implements none of it and sits outside
the request path: the widget calls the app's public API (`/api/v1/public/sites/{public_key}/...`)
directly.

What the plugin contributes:

- **Enqueueing the widget** — only when the `enabled` setting is on and a `siteKey` is stored.
- **The service worker** — `/?notifypress_sw=1`, served from the bundled file, with the path passed
  to the widget in the script tag's `data-notifypress-sw` attribute. FCM registers against it.
- **The settings that shape it** — prompt copy/style/timing, geolocation, "remove powered by",
  and the welcome notification all live on the app's site record; the settings screen writes them
  with `PUT {app}/api/v1/sites/current`, and the app applies them when it builds `widget.js` (and
  when a subscriber is created).

## Automatic Notifications (Observer pattern)

Each of these is a `Service` that wires a WordPress/plugin event to a push notification via
`Notifier::notify_subscriber(s)` → `{app}/api/v1/notifications/send`. Gated individually by a
`Settings` toggle where noted.

- **New Post** (`NewPost`) — on `transition_post_status` reaching `publish` for a public post
  type, notifies all subscribers with the post's notification title/message + permalink. Gated by
  `postNotificationEnabled`, then by the post type: Settings → WordPress Events lists every public
  post type (custom ones included, attachments excluded) with a switch each, and
  `postNotificationPostTypes` is the resulting list — the only source of truth, so a post type
  registered later by some other plugin stays silent until it is switched on. **Only `post` is on
  by default**; pages and custom post types are opt-in. Choices come from a
  `GET /notifypress/v1/post-types` REST endpoint, and the list is validated against
  `PostTypeOptions::selectable_names()`. `SettingsRepository::ensure_defaults()` is hooked to
  `init` at priority 20, so custom post types are registered before any of that is computed. What gets sent — and whether this particular post sends at all — comes from the
  post's own meta, edited in the block editor panel (see below) and resolved by
  `NewPost\PostNotification`. It also exposes a test-send AJAX action
  (`notifypress_send_test_notification`) that delivers to one subscriber only.
- **WooCommerce order placed** (`WC\OrderNotifications`) — on
  `woocommerce_checkout_order_processed` and `woocommerce_store_api_checkout_order_processed`
  (classic and block checkout; each fires exactly once, while the shopper is still the current
  visitor), confirms the order **to the shopper who placed it** and to nobody else, with the
  order number + view-order link. Gated by `wcOrderNotificationEnabled`. A shopper with no
  subscriber token is not notified, and no broadcast fallback exists — the link is a My Account
  page only that customer can open, so there is nobody else it could sensibly go to. The token
  is stamped onto the order (`_notifypress_subscriber_token`) as it sends, and a
  `_notifypress_order_notified` marker makes a repeat call a no-op.
- **WooCommerce subscriber token bridge** (`WC\TokenBridge`) — see below. Both features above
  depend on it.
- **WooCommerce abandoned cart** (`WC\AbandonedCart\*`) — see below.

Both WooCommerce features are entirely inactive on sites without the WooCommerce plugin —
`WC::register()` is a no-op unless `WC::is_active()`. The Settings → WooCommerce tab is hidden
accordingly (driven by a `wooCommerceActive` flag computed live, not stored).

## Subscriber Token Bridge

`WC\TokenBridge` is what makes any "notify this one shopper" feature possible. The widget keeps
the subscriber token in `localStorage` under `notifypress-SubscriptionToken`, which PHP cannot
read; `SubscriberToken::for_current_visitor()` reads it from user meta (logged in) or the
WooCommerce session (guest). **Until this class existed nothing ever wrote to either**, so both
`OrderNotifications` and the abandoned-cart reminder resolved an empty token and silently sent
nothing — the reminder had never fired in production.

A static script, `assets/token-bridge.js`, is enqueued only when the widget is (so it is absent
when the widget is, and there is then no token to mirror); its config is printed before it as
`window.notifypressTokenBridge`. It is a file rather than a PHP heredoc because Plugin Check
rejects heredocs. It reads the token, skips the request when it matches
what it already synced this session (`sessionStorage['notifypress-TokenSynced']`), and otherwise
POSTs it to `notifypress_store_subscription_token`, retrying a few times to cover the async
widget not having written the token yet on a first visit. The handler checks a nonce, bounds
the token to 20–512 chars of `[A-Za-z0-9_:.-]`, and writes it to user meta and/or the WC session. A
guest with an empty cart has no WC session cookie yet, so the handler starts one first
(`set_customer_session_cookie( true )`); without it the value is never saved. Verified against
a running WooCommerce: the token lands in the guest's `woocommerce_sessions` row.

The storage keys live on `Services\SubscriberToken` — previously they were private constants
inside `CartTracker`, so a second consumer had to redeclare them. `uninstall.php` deletes the
user-meta key and must stay in step with `SubscriberToken::USER_META`.

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

`Assets` serves the plugin's bundled `notifypress-sw.js` at `/?notifypress_sw=1`, under the widget's
own `notifypress-push/` scope. It handles push only, so it runs beside any other worker on the site.
The query string reaches WordPress on any web server and in subfolder installs.

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

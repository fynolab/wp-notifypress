=== NotifyPress - Web Push Notifications ===
Contributors: fynolab
Tags: push notifications, web push, notifications, pwa, progressive web app
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 1.1.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Web push notifications for WordPress and WooCommerce. Send campaigns, automate follow-ups and track every click from your WordPress dashboard.

== Description ==

[NotifyPress](https://notifypress.com/?utm_source=wordpress.org&utm_medium=plugin-listing) turns your website visitors into an audience you can reach any time. Visitors subscribe with one click, and you send them browser push notifications about new posts, products, sales and orders. No email address and no app install needed.

Everything runs inside your WordPress admin: send campaigns, watch the numbers come in, and let automations follow up with new subscribers for you.

= Campaigns =

* Send a notification now or schedule it for later.
* Notify subscribers automatically when you publish a post, page or any public custom post type.
* Write a custom title and message per post from the block editor sidebar, with a live preview.
* See delivery status, views and clicks for every notification.

= Opt-in prompt =

* Choose a Minimal, Card or Banner prompt and match it to your brand color.
* Set the prompt text, buttons, icon and bell position.
* Control when the prompt appears and how long to wait before showing it again.
* Greet new subscribers with an optional welcome notification.

= WooCommerce =

* Send order confirmations to the customer who placed the order.
* Remind subscribers about an abandoned cart one hour later.
* Both are sent only to the customer they concern, and both can be turned off.

= Subscribers and segments =

* Browse subscribers with their city, country, browser, device and timezone.
* Build segments by country and other rules to target the right audience. (Paid plans)

= Automations =

* Start from a pre-built template such as a welcome message or re-engagement series.
* Build workflows on a visual canvas with wait, send notification, add tag and webhook steps.
* Track how many subscribers are active, finished or suspended in each workflow.
* Automations are available on paid plans.

= Analytics and reports =

* Dashboard with subscriber growth, campaigns sent, click rate, upcoming sends, an audience map, devices and browsers, and plan limit warnings.
* Charts for monthly sends, subscriber growth, browser breakdown and subscriber activity.
* Download PDF reports for campaign performance, subscriber growth and a monthly summary. (Paid plans)

= Also included =

* Optional Progressive Web App (PWA) support.
* Works on desktop and mobile browsers that support the Web Push API.

**Free and paid plans**

The plugin is free. It connects to the NotifyPress service, which has a free plan for getting started and paid plans that raise subscriber limits and unlock segments, automations and PDF reports. See [NotifyPress pricing](https://notifypress.com/?utm_source=wordpress.org&utm_medium=plugin-listing#pricing) for details.

**How It Works**

1. Install and activate the plugin.
2. Run the setup wizard and connect a free NotifyPress account.
3. Visitors see the opt-in prompt and subscribe with one click.
4. Send campaigns, or let new posts, WooCommerce events and automations send for you.

**Privacy**

* All data is sent over HTTPS.
* Visitors are only subscribed after they accept the browser's notification permission prompt.
* Visitors can unsubscribe at any time.
* See "External services" below for exactly what is sent and when.

== External services ==

This plugin is the WordPress side of the NotifyPress web push service. It does not work without a NotifyPress account, and it connects to the services below only after you connect the site in the plugin settings.

**NotifyPress ([app.notifypress.com](https://app.notifypress.com))**

NotifyPress stores subscribers and delivers notifications.

* In the WordPress admin, the plugin's dashboard pages load your stats, subscribers, campaigns and reports from the NotifyPress API. Requests go through your own site, which adds your API token on the server, so the token is never sent to the browser.
* When you publish a post (if enabled), or a subscribed WooCommerce customer places an order or abandons their cart (if enabled), the plugin sends the notification title, message, link and, for WooCommerce, that customer's subscription token to the NotifyPress API.
* On every front-end page, the plugin loads the NotifyPress widget script from app.notifypress.com, which shows the opt-in prompt. The service worker the plugin serves at /?notifypress_sw=1 is bundled with the plugin; when a notification is shown or clicked, it reports the view or click to app.notifypress.com along with the visitor's browser, device type and timezone (used to count views and clicks per country).
* When a visitor accepts the browser's notification prompt, the widget sends NotifyPress their push subscription token, IP address, city and country, browser, device and timezone.
* To deliver notifications, the widget loads Google's push messaging library from www.gstatic.com when a visitor opts in, and at most once a day on later visits to keep their subscription token current. [Google terms](https://policies.google.com/terms) · [Google privacy policy](https://policies.google.com/privacy)

[NotifyPress terms of service](https://notifypress.com/terms-of-service?utm_source=wordpress.org&utm_medium=plugin-listing) · [NotifyPress privacy policy](https://notifypress.com/privacy-policy?utm_source=wordpress.org&utm_medium=plugin-listing)

== Source code ==

The compiled admin app in assets/main-dist and assets/editor-dist is built from the uncompiled source shipped with the plugin in assets/src. The build configuration (package.json, webpack.config.js, tsconfig.json, postcss.config.js, tailwind.config.js) is included too. To rebuild:

1. Install Node.js and pnpm.
2. Run `pnpm install`.
3. Run `pnpm run build`.

== Installation ==

1. Upload the `notifypress` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to NotifyPress settings page
4. Click "Connect to NotifyPress App" and sign in or create a free account, or paste an API token from [app.notifypress.com](https://app.notifypress.com)
5. Choose which notifications to send automatically
6. Configure your notification preferences

== Frequently Asked Questions ==

= Do I need a NotifyPress account? =

Yes. The plugin connects your site to the NotifyPress service, which stores subscribers and delivers notifications. You can create a free account at [app.notifypress.com](https://app.notifypress.com/register).

= Is this plugin free? =

Yes, the plugin is free to use. The NotifyPress service has a free plan, and paid plans raise subscriber limits and unlock segments, automations and PDF reports.

= Does this work on mobile devices? =

Yes! Web push notifications work on mobile browsers that support the Web Push API, including Chrome, Firefox, and Safari.

= Do visitors need to install an app? =

No, visitors simply click "Allow" when prompted to receive notifications. No app installation required.

= Is this GDPR compliant? =

Visitors must opt in through the browser's permission prompt and can unsubscribe at any time. Subscribing stores personal data (such as the visitor's IP address and approximate location) with NotifyPress, so as the site owner you should mention web push notifications and NotifyPress in your own privacy policy. See the [NotifyPress GDPR page](https://notifypress.com/gdpr-compliance?utm_source=wordpress.org&utm_medium=plugin-listing).

= Does this work with WooCommerce? =

Yes. When a customer who has subscribed to notifications places an order, they get a confirmation notification. Subscribers who leave items in their cart get one reminder an hour later. Both can be turned off in the plugin settings.

= Can I customize the notifications? =

Yes, you can customize notification titles, messages, icons, and target URLs through the plugin settings.

== Screenshots ==

1. Dashboard with notifications sent, subscriber totals, click rate, top countries and recent campaigns.
2. Guided setup wizard to connect your NotifyPress account and review your site details.
3. Campaigns list with delivery status, views and clicks for every notification.
4. Subscriber list with location, browser, device, tags and how many subscribers you can reach.
5. Segments to target subscribers by country and other rules.
6. Pre-built automation templates such as welcome messages and re-engagement.
7. Visual automation builder with wait, send notification, add tag and webhook steps.
8. Automation workflows list with live enrollment stats.
9. Analytics overview inside WordPress admin.
10. PDF reports for campaign performance, subscriber growth and monthly summaries.
11. Opt-in prompt settings with layout styles, accent color, bell position and live preview.
12. PDF reports generate in the background with live progress, then download.
13. The full dashboard: audience map by country, recent campaigns, daily subscriber growth, and devices and browsers.

== Changelog ==

= 1.1.1 =
* Improved: Updated the bundled NotifyPress PHP SDK to 0.2.0.

= 1.1.0 =
* New: Redesigned admin pages that match the NotifyPress app: dashboard, campaigns, subscribers, segments, automations, analytics and reports.
* New: Every date and time shows in your own timezone, and scheduled campaigns go out at the exact time you pick.
* New: Recurring campaigns keep their timezone, including across daylight saving changes.
* New: Subscriber list with browser and device icons, tags and how many subscribers you can reach.
* New: Developers can point the plugin at another NotifyPress app with the NOTIFYPRESS_APP_URL constant in wp-config.php.
* Improved: Subscribers show in the same order and date format as the app.

= 1.0.1 =
* Improved: Clearer setup screen description that covers sending push notifications.
* Improved: Plugin listing title and clickable links in the plugin description.

= 1.0.0 =
* Initial release
* Web push notification support
* WooCommerce integration
* New post notifications
* Subscriber management
* Segmentation features
* PWA support
* REST API endpoints

== Upgrade Notice ==

= 1.1.1 =
Updates the bundled NotifyPress PHP SDK.

= 1.1.0 =
Redesigned admin pages, and every date and time now shows in your own timezone.

= 1.0.0 =
Initial release of NotifyPress.

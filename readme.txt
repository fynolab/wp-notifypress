=== NotifyPress ===
Contributors: fynolab
Tags: push notifications, web push, notifications, pwa, progressive web app
Requires at least: 6.0
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Send web push notifications to your website visitors. Supports WooCommerce and custom post types.

== Description ==

NotifyPress is a powerful WordPress plugin that enables you to send web push notifications to your website visitors. Keep your audience engaged with timely updates about new posts, products, orders, and more.

**Key Features:**

* Send push notifications for new blog posts
* WooCommerce integration: order confirmations and abandoned cart reminders, sent only to the customer they concern
* Customizable notification templates
* Subscriber management
* Audience segmentation
* Real-time notification delivery
* Progressive Web App (PWA) support
* Mobile-friendly notifications
* No app installation required

**What is Web Push?**

Web push notifications are messages that appear on your visitors' devices even when they're not actively browsing your website. Users can opt-in to receive these notifications and stay updated with your latest content.

**How It Works:**

1. Install and activate the plugin
2. Sign up for a free NotifyPress account at https://app.notifypress.com
3. Click "Connect to NotifyPress App" in the plugin settings, or paste an API token
4. Your visitors can subscribe to notifications
5. Send notifications automatically or manually

**Privacy**

* All data is sent over HTTPS.
* Visitors are only subscribed after they accept the browser's notification permission prompt.
* Visitors can unsubscribe at any time.
* See "External services" below for exactly what is sent and when.

== External services ==

This plugin is the WordPress side of the NotifyPress web push service. It does not work without a NotifyPress account, and it connects to the services below only after you connect the site in the plugin settings.

**NotifyPress (app.notifypress.com)**

NotifyPress stores subscribers and delivers notifications.

* In the WordPress admin, the plugin's dashboard pages load your stats, subscribers, campaigns and reports from the NotifyPress API. Requests go through your own site, which adds your API token on the server, so the token is never sent to the browser.
* When you publish a post (if enabled), or a subscribed WooCommerce customer places an order or abandons their cart (if enabled), the plugin sends the notification title, message, link and, for WooCommerce, that customer's subscription token to the NotifyPress API.
* On every front-end page, the plugin loads the NotifyPress widget script from app.notifypress.com, which shows the opt-in prompt. The service worker the plugin serves at /service-worker.js is bundled with the plugin; when a notification is shown or clicked, it reports the view or click to app.notifypress.com along with the visitor's browser and device type.
* When a visitor accepts the browser's notification prompt, the widget sends NotifyPress their push subscription token, IP address, city and country, browser, device and timezone.

Terms of service: https://notifypress.com/terms-of-service
Privacy policy: https://notifypress.com/privacy-policy

**Google Firebase Cloud Messaging (FCM)**

NotifyPress delivers notifications through Firebase Cloud Messaging. The widget loads the Firebase SDK from www.gstatic.com in the visitor's browser, and the browser registers with Firebase to receive a push subscription token when the visitor opts in.

Terms of service: https://firebase.google.com/terms
Privacy policy: https://policies.google.com/privacy

== Source code ==

The compiled admin app in assets/main-dist and assets/editor-dist is built from the uncompiled source shipped with the plugin in assets/src. The build configuration (package.json, webpack.config.js, tsconfig.json, postcss.config.js, tailwind.config.js) is included too. To rebuild:

1. Install Node.js and pnpm.
2. Run `pnpm install`.
3. Run `pnpm run build`.

== Installation ==

1. Upload the `notifypress` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to NotifyPress settings page
4. Click "Connect to NotifyPress App" and sign in or create a free account, or paste an API token from https://app.notifypress.com
5. Choose which notifications to send automatically
6. Configure your notification preferences

== Frequently Asked Questions ==

= Do I need a NotifyPress account? =

Yes. The plugin connects your site to the NotifyPress service, which stores subscribers and delivers notifications. You can create a free account at https://app.notifypress.com.

= Is this plugin free? =

Yes, the plugin is free to use. NotifyPress offers both free and premium plans based on your notification volume.

= Does this work on mobile devices? =

Yes! Web push notifications work on mobile browsers that support the Web Push API, including Chrome, Firefox, and Safari.

= Do visitors need to install an app? =

No, visitors simply click "Allow" when prompted to receive notifications. No app installation required.

= Is this GDPR compliant? =

Visitors must opt in through the browser's permission prompt and can unsubscribe at any time. Subscribing stores personal data (such as the visitor's IP address and approximate location) with NotifyPress, so as the site owner you should mention web push notifications and NotifyPress in your own privacy policy. See the NotifyPress GDPR page: https://notifypress.com/gdpr-compliance

= Does this work with WooCommerce? =

Yes. When a customer who has subscribed to notifications places an order, they get a confirmation notification. Subscribers who leave items in their cart get one reminder an hour later. Both can be turned off in the plugin settings.

= Can I customize the notifications? =

Yes, you can customize notification titles, messages, icons, and target URLs through the plugin settings.

== Screenshots ==

1. Dashboard with notifications sent, subscriber totals, click rate, top countries and recent campaigns.
2. Guided setup wizard to connect your NotifyPress account and review your site details.
3. Campaigns list with delivery status, views and clicks for every notification.
4. Subscriber list with location, browser, device and timezone details.
5. Segments to target subscribers by country and other rules.
6. Pre-built automation templates such as welcome messages and re-engagement.
7. Visual automation builder with wait, send notification, add tag and webhook steps.
8. Automation workflows list with live enrollment stats.
9. Analytics overview inside WordPress admin.
10. Analytics charts for monthly sends, subscriber growth, browser breakdown and campaign status.
11. PDF reports for campaign performance, subscriber growth and monthly summaries.
12. Opt-in prompt settings with layout styles, accent color, bell position and live preview.

== Changelog ==

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

= 1.0.0 =
Initial release of NotifyPress.

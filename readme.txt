=== NotifyPress ===
Contributors: fynolab
Tags: push notifications, web push, notifications, pwa, progressive web app
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 1.0.0
License: GPL-2.0+
License URI: https://www.gnu.org/licenses/gpl-2.0.txt

Send web push notifications to your website visitors. Supports WooCommerce and custom post types.

== Description ==

NotifyPress is a powerful WordPress plugin that enables you to send web push notifications to your website visitors. Keep your audience engaged with timely updates about new posts, products, orders, and more.

**Key Features:**

* Send push notifications for new blog posts
* WooCommerce integration for order and abandoned cart notifications
* Customizable notification templates
* Subscriber management
* Audience segmentation
* Real-time notification delivery
* Progressive Web App (PWA) support
* Mobile-friendly notifications
* No app installation required

**Third-Party Service**

This plugin relies on the NotifyPress service (https://app.notifypress.com) to deliver push notifications. When you use this plugin:

* Subscriber tokens are sent to NotifyPress servers for notification delivery
* Your API key is used to authenticate requests
* Notification content (title, message, URLs) is transmitted to the service
* The subscription widget script is loaded from your NotifyPress app instance (https://app.notifypress.com by default)
* The service worker imports its implementation from the NotifyPress CDN (https://cdn.notifypress.com)

By using this plugin, you agree to the NotifyPress Terms of Service and Privacy Policy:
* Terms of Service: https://notifypress.com/terms
* Privacy Policy: https://notifypress.com/privacy

**What is Web Push?**

Web push notifications are messages that appear on your visitors' devices even when they're not actively browsing your website. Users can opt-in to receive these notifications and stay updated with your latest content.

**How It Works:**

1. Install and activate the plugin
2. Sign up for a free NotifyPress account at https://app.notifypress.com
3. Enter your API key in the plugin settings
4. Your visitors can subscribe to notifications
5. Send notifications automatically or manually

**Privacy & Security**

* All data transmissions use HTTPS encryption
* Subscriber consent is required before sending notifications
* Users can unsubscribe at any time
* No personal data is collected without consent
* GDPR compliant

== Installation ==

1. Upload the `notifypress` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to NotifyPress settings page
4. Sign up for an API key at https://app.notifypress.com
5. Enter your API key in the settings
6. Configure your notification preferences

== Frequently Asked Questions ==

= Do I need a NotifyPress account? =

Yes, you need to sign up for a free account at https://app.notifypress.com to get your API key.

= Is this plugin free? =

Yes, the plugin is free to use. NotifyPress offers both free and premium plans based on your notification volume.

= Does this work on mobile devices? =

Yes! Web push notifications work on mobile browsers that support the Web Push API, including Chrome, Firefox, and Safari.

= Do visitors need to install an app? =

No, visitors simply click "Allow" when prompted to receive notifications. No app installation required.

= Is this GDPR compliant? =

Yes, users must explicitly opt-in to receive notifications, and they can unsubscribe at any time.

= Does this work with WooCommerce? =

Yes! The plugin includes built-in support for WooCommerce order notifications and abandoned cart reminders.

= Can I customize the notifications? =

Yes, you can customize notification titles, messages, icons, and target URLs through the plugin settings.

== Screenshots ==

1. Dashboard showing notification statistics
2. Subscriber management interface
3. Notification settings page
4. Segment creation
5. Real-time notification preview

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

== Third-Party Services ==

This plugin connects to the following external services:

**NotifyPress API**
* Service URL: https://app.notifypress.com
* Purpose: Push notification delivery and subscriber management
* Privacy Policy: https://notifypress.com/privacy
* Terms of Service: https://notifypress.com/terms

**NotifyPress CDN**
* Service URL: https://cdn.notifypress.com
* Purpose: Serves the subscription widget script and the service worker implementation that handles push events in the visitor's browser
* Privacy Policy: https://notifypress.com/privacy
* Terms of Service: https://notifypress.com/terms

The plugin sends the following data to these services:
* Subscriber tokens (anonymous identifiers)
* Notification content (titles, messages, URLs)
* API authentication token

No personally identifiable information is transmitted without explicit user consent.


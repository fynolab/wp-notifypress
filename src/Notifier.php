<?php
/**
 * Public Notifier facade.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress;

use Fynolab\NotifyPress\Abstracts\Notifier as AbstractNotifier;

defined( 'ABSPATH' ) || exit;

/**
 * Sends notification payloads via the configured NotifyPress channel.
 */
class Notifier extends AbstractNotifier implements Interfaces\Notifier {

	/**
	 * Send notification to all subscribers.
	 *
	 * @param array $payload The notification payload.
	 *
	 * @return bool Whether the app accepted the notification.
	 */
	public static function notify_subscribers( array $payload ): bool {
		return self::send( $payload );
	}

	/**
	 * Send notification to a specific subscriber.
	 *
	 * @param string $subscriber_token The subscriber's token.
	 * @param array  $payload          The notification payload.
	 *
	 * @return bool Whether the app accepted the notification.
	 */
	public static function notify_subscriber( string $subscriber_token, array $payload ): bool {
		return self::send( array_merge( $payload, array( 'subscriber_token' => $subscriber_token ) ) );
	}
}

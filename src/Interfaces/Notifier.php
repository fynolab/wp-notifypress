<?php
/**
 * Notifier interface
 *
 * @package NotifyPress\App\Interfaces
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Interfaces;

defined( 'ABSPATH' ) || exit;

interface Notifier {
	/**
	 * Send notification to a specific subscriber.
	 *
	 * @param string $subscriber_token The subscriber's token.
	 * @param array  $payload          The notification payload.
	 * @return bool Whether the app accepted the notification.
	 */
	public static function notify_subscriber( string $subscriber_token, array $payload ): bool;

	/**
	 * Send notification to all subscribers.
	 *
	 * @param array $payload The notification payload.
	 * @return bool Whether the app accepted the notification.
	 */
	public static function notify_subscribers( array $payload ): bool;
}

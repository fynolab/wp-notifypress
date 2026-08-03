<?php
/**
 * Notifier class.
 *
 * @package Fynolab\NotifyPress\Abstracts
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Abstracts;

use Fynolab\NotifyPress\Services\NotifyPress\Client;
use NotifyPress\Exception\NotifyPressException;
use NotifyPress\Payload\SendNotification;
use function Fynolab\NotifyPress\Helpers\log;

defined( 'ABSPATH' ) || exit;

/**
 * Base class for sending notification payloads to the NotifyPress API.
 *
 * Delivery runs through the official PHP SDK, which reports a refused send as a
 * typed exception rather than as a string that reads like a response body. That
 * is what lets send() return a plain bool: callers no longer have to inspect a
 * string to work out whether anything was actually delivered.
 */
abstract class Notifier {
	/**
	 * The error from the most recent failed send, for the caller to surface.
	 *
	 * @var string
	 */
	private static string $last_error = '';

	/**
	 * The reason the most recent send failed, or an empty string if it did not.
	 *
	 * @return string
	 */
	public static function last_error(): string {
		return self::$last_error;
	}

	/**
	 * Sanitize and send a notification payload to the NotifyPress API.
	 *
	 * @param  array $payload The notification payload.
	 *
	 * @return bool Whether the app accepted the notification.
	 */
	protected static function send( array $payload ): bool {
		self::$last_error = '';

		$client = Client::make();

		if ( null === $client ) {
			return self::fail( __( 'API key not configured', 'notifypress' ) );
		}

		$notification = self::to_notification( $payload );

		// A single-subscriber send is addressed by header, not by a body field —
		// the app reads `notifypress-subscription-token` and ignores anything
		// unknown in the JSON body, so putting the token there would silently
		// send to every subscriber instead of just the one.
		$subscriber_token = ! empty( $payload['subscriber_token'] )
			? sanitize_text_field( $payload['subscriber_token'] )
			: null;

		try {
			$result = $client->notifications->send( $notification, $subscriber_token );
		} catch ( NotifyPressException $exception ) {
			return self::fail( $exception->getMessage() );
		}

		log( 'Notification sent', array( 'message' => $result->message ) );

		return true;
	}

	/**
	 * Build the SDK payload from the plugin's loosely-shaped payload array.
	 *
	 * @param array $payload The notification payload.
	 *
	 * @return SendNotification
	 */
	private static function to_notification( array $payload ): SendNotification {
		$notification = SendNotification::make(
			sanitize_text_field( $payload['title'] ?? '' ),
			sanitize_text_field( $payload['message'] ?? '' )
		);

		// 'url' is the older name for the click-through target; both are still
		// accepted so an existing integration keeps working.
		$target_url = $payload['target_url'] ?? $payload['url'] ?? '';

		if ( ! empty( $target_url ) ) {
			$notification = $notification->targetUrl( esc_url_raw( $target_url ) );
		}

		if ( ! empty( $payload['icon'] ) ) {
			$notification = $notification->iconUrl( esc_url_raw( $payload['icon'] ) );
		}

		return $notification;
	}

	/**
	 * Record why a send failed, and report it as a failure.
	 *
	 * @param string $error The failure reason.
	 *
	 * @return false
	 */
	private static function fail( string $error ): bool {
		self::$last_error = $error;

		// The SDK keeps credentials out of exception messages, so this is safe
		// to log — unlike the token and endpoint this used to write out.
		log( 'Notification send failed', array( 'error' => $error ) );

		return false;
	}
}

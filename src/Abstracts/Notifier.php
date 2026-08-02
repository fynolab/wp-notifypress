<?php
/**
 * Notifier class.
 *
 * @package Fynolab\NotifyPress\Abstracts
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Abstracts;

use Fynolab\NotifyPress\Api;
use Fynolab\NotifyPress\Services\Settings\Settings;
use function Fynolab\NotifyPress\Helpers\log;

defined( 'ABSPATH' ) || exit;

/**
 * Base class for sending notification payloads to the NotifyPress API.
 */
abstract class Notifier {
	/**
	 * The NotifyPress API endpoint.
	 *
	 * @var string
	 */
	private static string $api_endpoint = '';

	/**
	 * The Bearer-prefixed API token.
	 *
	 * @var string
	 */
	private static string $token = '';

	/**
	 * Whether the last send() call reached the app and was accepted.
	 *
	 * send() returns the response body either way (an error string on
	 * failure), which callers can't reliably tell apart — the app answers a
	 * rejected send with a JSON body of the same shape as an accepted one.
	 *
	 * @var bool
	 */
	private static bool $last_send_succeeded = false;

	/**
	 * Whether the most recent send succeeded.
	 *
	 * @return bool
	 */
	public static function last_send_succeeded(): bool {
		return self::$last_send_succeeded;
	}

	/**
	 * Set up the API
	 *
	 * @return void
	 */
	private static function setup(): void {
		self::$api_endpoint = self::get_api_endpoint();
		self::$token        = self::get_api_token();
	}

	/**
	 * Get the API endpoint
	 *
	 * @return string
	 */
	private static function get_api_endpoint(): string {
		return Api::url( 'notifications/send' );
	}

	/**
	 * Get the API token
	 *
	 * @return string
	 */
	private static function get_api_token(): string {
		return 'Bearer ' . Settings::get( 'apiKey' );
	}

	/**
	 * Sanitize and send a notification payload to the NotifyPress API.
	 *
	 * @param  array $payload The notification payload.
	 *
	 * @return string
	 */
	protected static function send( array $payload ): string {
		self::setup();
		self::$last_send_succeeded = false;
		log( 'Sending the payload', $payload );

		// Validate API token exists.
		if ( empty( self::$token ) || 'Bearer ' === self::$token ) {
			$error = 'API key not configured';
			log( $error );
			return $error;
		}

		// Sanitize payload data.
		$sanitized_payload = array();
		if ( ! empty( $payload['title'] ) ) {
			$sanitized_payload['title'] = sanitize_text_field( $payload['title'] );
		}
		if ( ! empty( $payload['message'] ) ) {
			$sanitized_payload['message'] = sanitize_text_field( $payload['message'] );
		}
		if ( ! empty( $payload['target_url'] ) ) {
			$sanitized_payload['target_url'] = esc_url_raw( $payload['target_url'] );
		}
		if ( ! empty( $payload['icon'] ) ) {
			$sanitized_payload['icon'] = esc_url_raw( $payload['icon'] );
		}
		if ( ! empty( $payload['url'] ) ) {
			$sanitized_payload['url'] = esc_url_raw( $payload['url'] );
		}

		$headers = array(
			'Content-Type'  => 'application/json',
			'Authorization' => self::$token,
		);

		// A single-subscriber send is addressed by header, not by a body
		// field — the app reads `notifypress-subscription-token` and ignores
		// anything unknown in the JSON body, so putting the token there would
		// silently send to every subscriber instead of just the one.
		if ( ! empty( $payload['subscriber_token'] ) ) {
			$headers['notifypress-subscription-token'] = sanitize_text_field( $payload['subscriber_token'] );
		}

		$request = wp_remote_post(
			self::$api_endpoint,
			array(
				'headers' => $headers,
				'body'    => wp_json_encode( $sanitized_payload ),
				'timeout' => 15,
			)
		);

		log(
			'Token and Endpoint',
			array(
				'token'    => self::$token,
				'endpoint' => self::$api_endpoint,
			)
		);

		$error = '';

		if ( is_wp_error( $request ) ) {
			$error = $request->get_error_message();
		}

		$response = wp_remote_retrieve_body( $request );

		if ( 200 !== wp_remote_retrieve_response_code( $request ) ) {
			$error = $response;
		}

		if ( ! empty( $error ) ) {
			log( $error );
			return $error;
		}

		self::$last_send_succeeded = true;

		return $response;
	}
}

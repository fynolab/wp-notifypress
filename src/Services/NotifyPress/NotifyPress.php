<?php
/**
 * NotifyPress subscription and notifications service.
 *
 * @package Fynolab\NotifyPress\Services\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\NotifyPress;

use Fynolab\NotifyPress\Assets;
use Fynolab\NotifyPress\Interfaces\Service;
use Fynolab\NotifyPress\Services\Settings\Settings;
use function Fynolab\NotifyPress\Helpers\log;

defined( 'ABSPATH' ) || exit;

/**
 * Handles subscriber AJAX endpoints and recent-notifications retrieval.
 */
class NotifyPress implements Service {
	private const RECENT_NOTIFICATIONS_CACHE_TTL = 2 * MINUTE_IN_SECONDS;

	/**
	 * Register hooks.
	 */
	public function __construct() {
		$this->hooks();
	}

	/**
	 * Register AJAX hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'wp_ajax_notifypress_update_subscription', array( $this, 'update_subscription' ) );
		add_action( 'wp_ajax_nopriv_notifypress_update_subscription', array( $this, 'update_subscription' ) );
		add_action( 'wp_ajax_notifypress_get_recent_notifications', array( $this, 'get_recent_notifications' ) );
		add_action( 'wp_ajax_nopriv_notifypress_get_recent_notifications', array( $this, 'get_recent_notifications' ) );
	}

	/**
	 * Update subscription.
	 *
	 * @return void
	 */
	public function update_subscription(): void {
		// Verify nonce.
		$nonce = sanitize_text_field( wp_unslash( $_POST['nonce'] ?? '' ) );

		if ( ! wp_verify_nonce( $nonce, Assets::NONCE_ACTION ) ) {
			wp_send_json_error( 'Invalid nonce' );
		}

		// Sanitize and validate input.
		$subscription_token = sanitize_text_field( wp_unslash( $_POST['subscriptionToken'] ?? '' ) );
		$active             = ( sanitize_text_field( wp_unslash( $_POST['active'] ?? '' ) ) === 'true' );

		// Validate subscription token.
		if ( empty( $subscription_token ) ) {
			wp_send_json_error( 'Subscription token is required' );
		}

		$subscription = array(
			'token'  => $subscription_token,
			'active' => $active,
		);

		// Save data to the database.
		$api_endpoint = $this->get_api_url( 'subscribers' );
		$api_token    = Settings::get( 'apiKey' );

		// Validate API key exists.
		if ( empty( $api_token ) ) {
			wp_send_json_error( 'API key not configured' );
		}

		delete_transient( $this->get_recent_notifications_cache_key( $api_token ) );

		$api_token = 'Bearer ' . $api_token;

		$response = wp_remote_post(
			$api_endpoint,
			array(
				'body'    => wp_json_encode( $subscription ),
				'headers' => array(
					'Content-Type'  => 'application/json',
					'Authorization' => $api_token,
				),
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( $response->get_error_message() );
		}

		$response_code = wp_remote_retrieve_response_code( $response );

		if ( 429 === $response_code ) {
			wp_send_json_error( 'Too many requests.' );
		}

		$response_body = wp_remote_retrieve_body( $response );

		if ( 200 !== $response_code ) {
			wp_send_json_error( 'Subscription update failed' );
		}

		$data          = json_decode( $response_body );
		$response_data = $data->data ?? array();

		wp_send_json_success( $response_data );
	}

	/**
	 * Get recent notifications.
	 *
	 * @return void
	 */
	public function get_recent_notifications(): void {
		// Add nonce verification for logged-in users.
		if ( is_user_logged_in() ) {
			$nonce = sanitize_text_field( wp_unslash( $_POST['nonce'] ?? '' ) );
			if ( ! wp_verify_nonce( $nonce, Assets::NONCE_ACTION ) ) {
				wp_send_json_error( 'Invalid nonce' );
			}
		}

		$api_endpoint = $this->get_api_url( 'notifications' );
		$api_token    = Settings::get( 'apiKey' );

		// Validate API key exists.
		if ( empty( $api_token ) ) {
			wp_send_json_error( 'API key not configured' );
		}

		$cache_key    = $this->get_recent_notifications_cache_key( $api_token );
		$cached_items = get_transient( $cache_key );

		if ( false !== $cached_items ) {
			wp_send_json_success( $cached_items );
		}

		$api_token = 'Bearer ' . $api_token;
		$api_url   = add_query_arg(
			array(
				'limit'  => 3,
				'status' => 'sent',
			),
			$api_endpoint
		);

		$response = wp_remote_get(
			$api_url,
			array(
				'headers' => array(
					'Authorization' => $api_token,
				),
				'timeout' => 15,
			)
		);

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( $response->get_error_message() );
		}

		$response_code = wp_remote_retrieve_response_code( $response );

		if ( 429 === $response_code ) {
			wp_send_json_error( 'Too many requests.' );
		}

		$response_body = wp_remote_retrieve_body( $response );

		if ( 200 !== $response_code ) {
			wp_send_json_error( 'Failed to fetch notifications' );
		}

		$data          = json_decode( $response_body );
		$response_data = $data->data ?? array();

		set_transient( $cache_key, $response_data, self::RECENT_NOTIFICATIONS_CACHE_TTL );

		wp_send_json_success( $response_data );
	}

	/**
	 * Build a full NotifyPress API URL for the given path.
	 *
	 * @param string $path The API path, relative to /api/v1/.
	 *
	 * @return string
	 */
	private function get_api_url( string $path ): string {
		$app_url = untrailingslashit( Settings::get( 'appUrl', Settings::DEFAULT_APP_URL ) );

		return $app_url . '/api/v1/' . ltrim( $path, '/' );
	}

	/**
	 * Build the transient key used to cache recent notifications.
	 *
	 * @param string $api_token The API token, used to scope the cache per account.
	 *
	 * @return string
	 */
	private function get_recent_notifications_cache_key( string $api_token ): string {
		$app_url = untrailingslashit( Settings::get( 'appUrl', Settings::DEFAULT_APP_URL ) );

		return 'notifypress_recent_notifications_' . md5( $app_url . '|' . $api_token );
	}

	/**
	 * Register the service.
	 *
	 * @return void
	 */
	public static function register(): void {
		new self();
	}
}

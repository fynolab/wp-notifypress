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
use Fynolab\NotifyPress\Services\NotifyPress\Rest\ProxyController;
use NotifyPress\Enum\NotificationStatus;
use NotifyPress\Exception\NotifyPressException;
use NotifyPress\Exception\RateLimitException;
use NotifyPress\Model\Notification;
use NotifyPress\Payload\SubscriberCreate;
use NotifyPress\Query\NotificationQuery;

defined( 'ABSPATH' ) || exit;

/**
 * Handles subscriber AJAX endpoints and recent-notifications retrieval.
 *
 * Both endpoints proxy the visitor's browser to the app through the PHP SDK, so
 * the site's API token never reaches the page.
 */
class NotifyPress implements Service {
	private const RECENT_NOTIFICATIONS_CACHE_TTL = 2 * MINUTE_IN_SECONDS;

	private const RECENT_NOTIFICATIONS_LIMIT = 3;

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
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		add_action( 'wp_ajax_notifypress_update_subscription', array( $this, 'update_subscription' ) );
		add_action( 'wp_ajax_nopriv_notifypress_update_subscription', array( $this, 'update_subscription' ) );
		add_action( 'wp_ajax_notifypress_get_recent_notifications', array( $this, 'get_recent_notifications' ) );
		add_action( 'wp_ajax_nopriv_notifypress_get_recent_notifications', array( $this, 'get_recent_notifications' ) );
	}

	/**
	 * Register the app-proxy REST controller.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		( new ProxyController() )->register_routes();
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

		$client = Client::make();

		if ( null === $client ) {
			wp_send_json_error( 'API key not configured' );
		}

		delete_transient( $this->get_recent_notifications_cache_key() );

		try {
			$subscriber = $client->subscribers->create(
				SubscriberCreate::make( $subscription_token )->active( $active )
			);
		} catch ( RateLimitException $exception ) {
			wp_send_json_error( 'Too many requests.' );
		} catch ( NotifyPressException $exception ) {
			wp_send_json_error( 'Subscription update failed' );
		}

		// The raw record, so the browser sees exactly the shape the app sent.
		wp_send_json_success( $subscriber->toArray() );
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

		$client = Client::make();

		if ( null === $client ) {
			wp_send_json_error( 'API key not configured' );
		}

		$cache_key    = $this->get_recent_notifications_cache_key();
		$cached_items = get_transient( $cache_key );

		if ( false !== $cached_items ) {
			wp_send_json_success( $cached_items );
		}

		try {
			$page = $client->notifications->list(
				NotificationQuery::make()
					->limit( self::RECENT_NOTIFICATIONS_LIMIT )
					->status( NotificationStatus::SENT )
			);
		} catch ( RateLimitException $exception ) {
			wp_send_json_error( 'Too many requests.' );
		} catch ( NotifyPressException $exception ) {
			wp_send_json_error( 'Failed to fetch notifications' );
		}

		$notifications = array_map(
			static fn ( Notification $notification ): array => $notification->toArray(),
			$page->data
		);

		set_transient( $cache_key, $notifications, self::RECENT_NOTIFICATIONS_CACHE_TTL );

		wp_send_json_success( $notifications );
	}

	/**
	 * Build the transient key used to cache recent notifications.
	 *
	 * Scoped to the API token so reconnecting to a different account never
	 * serves the previous one's notifications.
	 *
	 * @return string
	 */
	private function get_recent_notifications_cache_key(): string {
		return 'notifypress_recent_notifications_' . md5( Client::token() );
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

<?php
/**
 * Subscriber token bridge.
 *
 * @package Fynolab\NotifyPress\Services\WC
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\WC;

use Fynolab\NotifyPress\Assets;
use Fynolab\NotifyPress\Interfaces\Observer as ObserverInterface;
use Fynolab\NotifyPress\Services\SubscriberToken;

defined( 'ABSPATH' ) || exit;

/**
 * Mirrors the widget's subscriber token from the browser into PHP.
 *
 * The widget keeps the token in `localStorage`, which server-side code cannot
 * read. Every feature that notifies one particular shopper — the order
 * confirmation, the abandoned-cart reminder — needs it in the WooCommerce
 * session or in user meta instead. Nothing wrote it there before this class,
 * so both features resolved an empty token and silently sent nothing.
 *
 * Deliberately registered only when WooCommerce is active (see WC::register),
 * because WooCommerce is the only consumer and a guest's copy lives in the
 * WooCommerce session.
 */
class TokenBridge implements ObserverInterface {
	/**
	 * The admin-ajax action name.
	 *
	 * @var string
	 */
	private const ACTION = 'notifypress_store_subscription_token';

	/**
	 * Nonce action for the store request.
	 *
	 * @var string
	 */
	private const NONCE_ACTION = 'notifypress-store-token';

	/**
	 * Script handle for the token sync script.
	 *
	 * @var string
	 */
	private const SCRIPT_HANDLE = 'notifypress-token-bridge';

	/**
	 * Longest token we will store.
	 *
	 * FCM registration tokens run to a couple of hundred characters; this is
	 * a sanity bound so a hostile caller cannot stuff the session.
	 *
	 * @var int
	 */
	private const TOKEN_MAX = 512;

	/**
	 * Shortest token we will treat as real.
	 *
	 * @var int
	 */
	private const TOKEN_MIN = 20;

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function observe(): void {
		// Priority 20: the widget is enqueued at the default 10, and the
		// inline script attaches to its handle.
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_sync_script' ), 20 );

		add_action( 'wp_ajax_' . self::ACTION, array( $this, 'store_token' ) );
		add_action( 'wp_ajax_nopriv_' . self::ACTION, array( $this, 'store_token' ) );
	}

	/**
	 * Enqueue the script that copies the token out of localStorage.
	 *
	 * Only alongside the widget: the widget is what writes the token, so if it
	 * is not on the page there is nothing to mirror.
	 *
	 * The script retries a few times because the widget is loaded async and
	 * may not have written the token yet on a first visit, or the visitor may
	 * subscribe part-way through this pageview. It stops as soon as the token
	 * it sees matches the one it last synced, so a repeat visitor makes no
	 * request.
	 *
	 * @return void
	 */
	public function enqueue_sync_script(): void {
		if ( is_admin() || ! wp_script_is( Assets::WIDGET_HANDLE, 'enqueued' ) ) {
			return;
		}

		$config = array(
			'ajaxUrl' => admin_url( 'admin-ajax.php' ),
			'action'  => self::ACTION,
			'nonce'   => wp_create_nonce( self::NONCE_ACTION ),
		);

		wp_enqueue_script(
			self::SCRIPT_HANDLE,
			NOTIFYPRESS_ASSETS_URL . 'token-bridge.js',
			array(),
			(string) filemtime( NOTIFYPRESS_ASSETS_DIR . 'token-bridge.js' ),
			true
		);

		wp_add_inline_script(
			self::SCRIPT_HANDLE,
			'window.notifypressTokenBridge = ' . wp_json_encode( $config ) . ';',
			'before'
		);
	}

	/**
	 * Persist the posted token for this visitor.
	 *
	 * @return void
	 */
	public function store_token(): void {
		if ( ! check_ajax_referer( self::NONCE_ACTION, 'nonce', false ) ) {
			wp_send_json_error( __( 'Expired request.', 'notifypress' ), 403 );
		}

		$token = sanitize_text_field( wp_unslash( $_POST['token'] ?? '' ) );

		if ( ! $this->is_valid_token( $token ) ) {
			wp_send_json_error( __( 'Invalid subscriber token.', 'notifypress' ), 400 );
		}

		$user_id = get_current_user_id();

		if ( $user_id ) {
			update_user_meta( $user_id, SubscriberToken::USER_META, $token );
		}

		// Stored for guests, and also for logged-in customers, so a shopper
		// who signs in mid-checkout is covered by whichever is read first.
		if ( function_exists( 'WC' ) && WC()->session ) {
			// A guest with an empty cart has no session cookie yet. Without
			// one, the value set below is never saved and the token is lost.
			if ( ! WC()->session->has_session() ) {
				WC()->session->set_customer_session_cookie( true );
			}

			WC()->session->set( SubscriberToken::SESSION, $token );
		}

		wp_send_json_success();
	}

	/**
	 * Whether a posted value looks like a subscriber token.
	 *
	 * @param string $token The posted token.
	 *
	 * @return bool
	 */
	private function is_valid_token( string $token ): bool {
		$length = strlen( $token );

		if ( $length < self::TOKEN_MIN || $length > self::TOKEN_MAX ) {
			return false;
		}

		return 1 === preg_match( '/^[A-Za-z0-9_:.-]+$/', $token );
	}
}

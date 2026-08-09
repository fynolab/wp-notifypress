<?php
/**
 * Subscriber token resolution.
 *
 * @package Fynolab\NotifyPress\Services
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services;

defined( 'ABSPATH' ) || exit;

/**
 * Resolves the NotifyPress subscriber token for the current visitor.
 *
 * The widget stores the token in the visitor's browser when they subscribe.
 * Server-side features that need to notify one particular person — an
 * abandoned-cart reminder, an order confirmation — read it from the two
 * places it is mirrored to: user meta for a logged-in customer, and the
 * WooCommerce session for a guest.
 *
 * These keys were previously private to CartTracker, which meant a second
 * caller had to redeclare them and hope the two stayed in step. They live
 * here now so there is one definition. `uninstall.php` deletes the user-meta
 * key on removal and must be kept in step with USER_META.
 */
class SubscriberToken {
	/**
	 * User meta key holding a logged-in customer's subscriber token.
	 *
	 * @var string
	 */
	public const USER_META = 'notifypress_subscription_token';

	/**
	 * WooCommerce session key holding a guest's subscriber token.
	 *
	 * @var string
	 */
	public const SESSION = 'notifypress_subscription_token';

	/**
	 * The subscriber token for whoever is making the current request.
	 *
	 * @return string The token, or an empty string when this visitor has not
	 *                subscribed in this browser.
	 */
	public static function for_current_visitor(): string {
		$user_id = get_current_user_id();

		if ( $user_id ) {
			return (string) get_user_meta( $user_id, self::USER_META, true );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return '';
		}

		return (string) WC()->session->get( self::SESSION );
	}
}

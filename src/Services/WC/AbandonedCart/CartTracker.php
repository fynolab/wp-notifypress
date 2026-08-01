<?php
/**
 * Abandoned cart tracker.
 *
 * @package Fynolab\NotifyPress\Services\WC\AbandonedCart
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\WC\AbandonedCart;

use Fynolab\NotifyPress\Interfaces\Observer as ObserverInterface;

defined( 'ABSPATH' ) || exit;

/**
 * Snapshots a subscriber's cart when items are added, and clears the
 * snapshot again once they actually check out.
 */
class CartTracker implements ObserverInterface {
	private const SUBSCRIPTION_TOKEN_USER_META = 'notifypress_subscription_token';
	private const SUBSCRIPTION_TOKEN_SESSION   = 'notifypress_subscription_token';

	/**
	 * The cart repository.
	 *
	 * @var CartRepository
	 */
	private CartRepository $carts;

	/**
	 * Set up the tracker.
	 *
	 * @param CartRepository $carts The cart repository.
	 */
	public function __construct( CartRepository $carts ) {
		$this->carts = $carts;
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function observe(): void {
		add_action( 'woocommerce_add_to_cart', array( $this, 'track' ), 10, 6 );

		// A completed checkout means the cart is no longer "abandoned" —
		// clear it under the same identity it was tracked under so the
		// reminder cron never fires for an order that already went through.
		add_action( 'woocommerce_thankyou', array( $this, 'clear' ) );
	}

	/**
	 * Snapshot the current cart for later abandoned-cart detection.
	 *
	 * Only carts belonging to a NotifyPress subscriber are worth storing —
	 * there's nothing to notify otherwise.
	 *
	 * @return void
	 */
	public function track(): void {
		$identity = $this->current_identity();

		if ( null === $identity ) {
			return;
		}

		$subscriber_token = $this->current_subscriber_token();

		if ( empty( $subscriber_token ) ) {
			return;
		}

		$this->carts->save(
			$identity,
			array(
				'subscriber_token' => $subscriber_token,
				'timestamp'        => time(),
				'item_count'       => $this->cart_item_count(),
			)
		);
	}

	/**
	 * Clear the tracked cart for the current session after checkout.
	 *
	 * @return void
	 */
	public function clear(): void {
		$identity = $this->current_identity();

		if ( null === $identity ) {
			return;
		}

		$this->carts->delete( $identity );
	}

	/**
	 * The identity a cart is tracked under: the logged-in user ID, or the
	 * WooCommerce session (guest) customer ID.
	 *
	 * @return string|null
	 */
	private function current_identity(): ?string {
		$user_id = get_current_user_id();

		if ( $user_id ) {
			return (string) $user_id;
		}

		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return null;
		}

		$session_id = WC()->session->get_customer_id();

		return $session_id ? (string) $session_id : null;
	}

	/**
	 * Resolve the NotifyPress subscriber token for the current visitor.
	 *
	 * @return string
	 */
	private function current_subscriber_token(): string {
		$user_id = get_current_user_id();

		if ( $user_id ) {
			return (string) get_user_meta( $user_id, self::SUBSCRIPTION_TOKEN_USER_META, true );
		}

		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return '';
		}

		return (string) WC()->session->get( self::SUBSCRIPTION_TOKEN_SESSION );
	}

	/**
	 * Number of items currently in the cart.
	 *
	 * @return int
	 */
	private function cart_item_count(): int {
		if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
			return 0;
		}

		return WC()->cart->get_cart_contents_count();
	}
}

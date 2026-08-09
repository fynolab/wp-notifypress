<?php
/**
 * Order notifications.
 *
 * @package Fynolab\NotifyPress\Services\WC
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\WC;

use WC_Order;
use Fynolab\NotifyPress\Interfaces\Observer as ObserverInterface;
use Fynolab\NotifyPress\Notifier;
use Fynolab\NotifyPress\Services\Settings\Settings;
use Fynolab\NotifyPress\Services\SubscriberToken;

defined( 'ABSPATH' ) || exit;

/**
 * Confirms a WooCommerce order to the shopper who placed it.
 */
class OrderNotifications implements ObserverInterface {
	/**
	 * Order meta holding the subscriber token to confirm this order to.
	 *
	 * Captured while the shopper is still the current visitor, because by the
	 * time anything else looks at this order there is no session to read.
	 *
	 * @var string
	 */
	private const TOKEN_META = '_notifypress_subscriber_token';

	/**
	 * Order meta marking that a confirmation was already sent.
	 *
	 * @var string
	 */
	private const NOTIFIED_META = '_notifypress_order_notified';

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function observe(): void {
		// Both of these fire exactly once, when the shopper places the order,
		// and while their session is still the current one. The classic and
		// block checkouts each have their own, so both are needed.
		add_action( 'woocommerce_checkout_order_processed', array( $this, 'on_checkout' ), 10, 3 );
		add_action( 'woocommerce_store_api_checkout_order_processed', array( $this, 'on_block_checkout' ), 10, 1 );
	}

	/**
	 * Classic checkout: an order has been placed.
	 *
	 * @param int      $order_id    The order ID.
	 * @param array    $posted_data The submitted checkout fields.
	 * @param WC_Order $order       The order object.
	 *
	 * @return void
	 */
	public function on_checkout( int $order_id, array $posted_data, WC_Order $order ): void {
		$this->confirm_order( $order );
	}

	/**
	 * Block checkout: an order has been placed.
	 *
	 * @param WC_Order $order The order object.
	 *
	 * @return void
	 */
	public function on_block_checkout( WC_Order $order ): void {
		$this->confirm_order( $order );
	}

	/**
	 * Send the shopper a confirmation for their own order.
	 *
	 * @param WC_Order $order The order that was just placed.
	 *
	 * @return void
	 */
	private function confirm_order( WC_Order $order ): void {
		if ( ! Settings::get( 'wcOrderNotificationEnabled', true ) ) {
			return;
		}

		if ( $order->get_meta( self::NOTIFIED_META ) ) {
			return;
		}

		$subscriber_token = SubscriberToken::for_current_visitor();

		if ( '' === $subscriber_token ) {
			return;
		}

		// Record who this order belongs to before sending. Even if the send
		// fails, a later feature notifying about this order knows the shopper.
		$order->update_meta_data( self::TOKEN_META, $subscriber_token );
		$order->save();

		$payload = array(
			'title'      => __( 'Thanks for your order', 'notifypress' ),
			/* translators: %s: order number. */
			'message'    => sprintf( __( 'Order %s is confirmed. Tap to track it.', 'notifypress' ), $order->get_order_number() ),
			'target_url' => $order->get_view_order_url(),
		);

		if ( ! Notifier::notify_subscriber( $subscriber_token, $payload ) ) {
			return;
		}

		$order->update_meta_data( self::NOTIFIED_META, time() );
		$order->save();
	}
}

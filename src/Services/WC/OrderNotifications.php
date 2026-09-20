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

defined( 'ABSPATH' ) || exit;

/**
 * Notifies subscribers when a new WooCommerce order is placed.
 */
class OrderNotifications implements ObserverInterface {
	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function observe(): void {
		add_action( 'woocommerce_order_status_changed', array( $this, 'on_new_order' ), 10, 4 );
	}

	/**
	 * Notify subscribers when an order's status changes.
	 *
	 * @param int      $order_id   The order ID.
	 * @param string   $old_status The previous order status.
	 * @param string   $new_status The new order status.
	 * @param WC_Order $order      The order object.
	 *
	 * @return void
	 */
	public function on_new_order( int $order_id, string $old_status, string $new_status, WC_Order $order ): void {
		if ( ! Settings::get( 'wcOrderNotificationEnabled', true ) ) {
			return;
		}

		$payload = array(
			'title'      => __( 'A new order has been placed', 'notifypress' ),
			/* translators: %d: order ID. */
			'message'    => sprintf( __( 'Order ID: %d', 'notifypress' ), $order_id ),
			'target_url' => $order->get_view_order_url(),
		);

		Notifier::notify_subscribers( $payload );
	}
}

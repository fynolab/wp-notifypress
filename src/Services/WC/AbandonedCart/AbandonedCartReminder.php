<?php
/**
 * Abandoned cart reminder.
 *
 * @package Fynolab\NotifyPress\Services\WC\AbandonedCart
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\WC\AbandonedCart;

use Fynolab\NotifyPress\Interfaces\Observer as ObserverInterface;
use Fynolab\NotifyPress\Notifier;
use Fynolab\NotifyPress\Services\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Periodically scans tracked carts and pushes a reminder notification to
 * subscribers who left items behind without checking out.
 */
class AbandonedCartReminder implements ObserverInterface {
	public const CRON_HOOK       = 'notifypress_abandoned_cart_check';
	private const REMINDER_AFTER = HOUR_IN_SECONDS;

	/**
	 * The cart repository.
	 *
	 * @var CartRepository
	 */
	private CartRepository $carts;

	/**
	 * Set up the reminder.
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
		add_action( self::CRON_HOOK, array( $this, 'process' ) );
	}

	/**
	 * Send a reminder for every cart that's been sitting long enough.
	 *
	 * @return void
	 */
	public function process(): void {
		if ( ! Settings::get( 'wcAbandonedCartNotificationEnabled', true ) ) {
			return;
		}

		$now = time();

		foreach ( $this->carts->all() as $option_name => $cart ) {
			if ( empty( $cart['timestamp'] ) || ( $now - (int) $cart['timestamp'] ) < self::REMINDER_AFTER ) {
				continue;
			}

			$subscriber_token = $cart['subscriber_token'] ?? '';

			if ( $subscriber_token ) {
				Notifier::notify_subscriber( $subscriber_token, $this->build_payload( $cart ) );
			}

			// Reminder is one-shot: drop the snapshot whether or not a
			// notification was actually sent, so it's never re-processed.
			$this->carts->delete_by_option_name( $option_name );
		}
	}

	/**
	 * Build the reminder notification payload.
	 *
	 * @param array $cart The stored cart snapshot.
	 *
	 * @return array
	 */
	private function build_payload( array $cart ): array {
		$item_count = (int) ( $cart['item_count'] ?? 0 );

		$message = $item_count > 0
			? sprintf(
				/* translators: %d: number of items left in the cart. */
				_n( 'You left %d item in your cart. Complete your purchase!', 'You left %d items in your cart. Complete your purchase!', $item_count, 'notifypress' ),
				$item_count
			)
			: __( 'You have items waiting in your cart. Complete your purchase!', 'notifypress' );

		return array(
			'title'      => __( 'Did you forget something?', 'notifypress' ),
			'message'    => $message,
			'target_url' => function_exists( 'wc_get_cart_url' ) ? wc_get_cart_url() : home_url( '/cart/' ),
		);
	}
}

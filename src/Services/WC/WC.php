<?php
/**
 * WC service
 *
 * @package Fynolab\NotifyPress\Services\WC
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\WC;

use Fynolab\NotifyPress\Interfaces\Service;
use Fynolab\NotifyPress\Services\WC\AbandonedCart\AbandonedCart;

defined( 'ABSPATH' ) || exit;

/**
 * WooCommerce service — bootstraps each WooCommerce-related feature.
 */
class WC implements Service {
	/**
	 * Wire up each feature's observer.
	 */
	private function __construct() {
		// First: everything below needs the subscriber token in PHP, and the
		// bridge is what puts it there.
		( new TokenBridge() )->observe();
		( new OrderNotifications() )->observe();
		( new AbandonedCart() )->observe();
	}

	/**
	 * Register the service — a no-op if WooCommerce isn't active, so we
	 * never hook WooCommerce actions, schedule the abandoned-cart cron, or
	 * touch `WC()`/`WC_Order` on a site that doesn't have it.
	 *
	 * @return void
	 */
	public static function register(): void {
		if ( ! self::is_active() ) {
			return;
		}

		new self();
	}

	/**
	 * Whether WooCommerce is active on this site.
	 *
	 * @return bool
	 */
	public static function is_active(): bool {
		return class_exists( 'WooCommerce' );
	}
}

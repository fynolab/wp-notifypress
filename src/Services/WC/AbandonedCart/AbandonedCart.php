<?php
/**
 * Abandoned cart feature.
 *
 * @package Fynolab\NotifyPress\Services\WC\AbandonedCart
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\WC\AbandonedCart;

use Fynolab\NotifyPress\Interfaces\Observer as ObserverInterface;
use Fynolab\NotifyPress\Services\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Wires up cart tracking + reminder sending, and keeps the reminder cron
 * schedule in sync with the "abandoned cart" setting.
 */
class AbandonedCart implements ObserverInterface {
	/**
	 * The tracker, snapshotting/clearing carts.
	 *
	 * @var CartTracker
	 */
	private CartTracker $tracker;

	/**
	 * The reminder, sending notifications for stale carts.
	 *
	 * @var AbandonedCartReminder
	 */
	private AbandonedCartReminder $reminder;

	/**
	 * Set up the feature.
	 */
	public function __construct() {
		$carts          = new CartRepository();
		$this->tracker  = new CartTracker( $carts );
		$this->reminder = new AbandonedCartReminder( $carts );
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function observe(): void {
		$this->tracker->observe();
		$this->reminder->observe();

		add_action( 'init', array( $this, 'sync_schedule' ) );
		add_action( 'notifypress_settings_updated', array( $this, 'sync_schedule' ) );
	}

	/**
	 * (Un)schedule the reminder cron to match the current setting, so
	 * toggling it off in the UI actually stops the cron from firing.
	 *
	 * @return void
	 */
	public function sync_schedule(): void {
		$enabled  = (bool) Settings::get( 'wcAbandonedCartNotificationEnabled', true );
		$next_run = wp_next_scheduled( AbandonedCartReminder::CRON_HOOK );

		if ( $enabled && ! $next_run ) {
			wp_schedule_event( time(), 'hourly', AbandonedCartReminder::CRON_HOOK );
			return;
		}

		if ( ! $enabled && $next_run ) {
			wp_unschedule_event( $next_run, AbandonedCartReminder::CRON_HOOK );
		}
	}
}

<?php
/**
 * Abandoned cart storage.
 *
 * @package Fynolab\NotifyPress\Services\WC\AbandonedCart
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\WC\AbandonedCart;

defined( 'ABSPATH' ) || exit;

/**
 * Stores and retrieves abandoned-cart snapshots as transients.
 *
 * There is no dedicated table for these, so "find all" has to scan
 * wp_options by LIKE — this class is the single place that knows that
 * transient-prefix trick, so nothing outside it touches $wpdb directly.
 */
class CartRepository {
	private const TRANSIENT_PREFIX = 'notifypress_abandoned_cart_';
	public const TTL               = 2 * HOUR_IN_SECONDS;

	/**
	 * Save a cart snapshot for the given identity.
	 *
	 * @param string $identity Unique cart owner identity (user ID or session ID).
	 * @param array  $data     Cart snapshot.
	 *
	 * @return void
	 */
	public function save( string $identity, array $data ): void {
		set_transient( $this->key( $identity ), $data, self::TTL );
	}

	/**
	 * Delete the cart snapshot for the given identity.
	 *
	 * @param string $identity Unique cart owner identity (user ID or session ID).
	 *
	 * @return void
	 */
	public function delete( string $identity ): void {
		delete_transient( $this->key( $identity ) );
	}

	/**
	 * Fetch every stored cart snapshot, keyed by its transient option name.
	 *
	 * @return array<string, array> Map of `_transient_{key}` option name => cart snapshot.
	 */
	public function all(): array {
		global $wpdb;

		$rows = $wpdb->get_results( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- scanning by LIKE pattern across all abandoned-cart transients; there is no single cache key to check.
			$wpdb->prepare(
				"SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_' . self::TRANSIENT_PREFIX ) . '%'
			)
		);

		if ( ! is_array( $rows ) ) {
			return array();
		}

		$carts = array();

		foreach ( $rows as $row ) {
			$data = maybe_unserialize( $row->option_value );

			if ( is_array( $data ) ) {
				$carts[ $row->option_name ] = $data;
			}
		}

		return $carts;
	}

	/**
	 * Delete a snapshot by its raw `_transient_{key}` option name, as returned by all().
	 *
	 * @param string $option_name The `_transient_{key}` option name.
	 *
	 * @return void
	 */
	public function delete_by_option_name( string $option_name ): void {
		delete_transient( str_replace( '_transient_', '', $option_name ) );
	}

	/**
	 * Build the transient key for a cart owner identity.
	 *
	 * @param string $identity Unique cart owner identity (user ID or session ID).
	 *
	 * @return string
	 */
	private function key( string $identity ): string {
		return self::TRANSIENT_PREFIX . $identity;
	}
}

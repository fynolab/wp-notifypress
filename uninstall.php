<?php
/**
 * Uninstall NotifyPress
 *
 * @package NotifyPress
 */

// If uninstall not called from WordPress, exit.
if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

// Delete plugin options.
delete_option( 'notifypress_settings' );
delete_option( 'notifypress_setup_redirect' );
delete_site_option( 'notifypress_settings' );

// Delete transients.
delete_transient( 'notifypress_cached_service_worker' );

// Delete abandoned cart transients. A direct, uncached query is required
// here: uninstall.php runs once and object caching is irrelevant to it.
global $wpdb;
$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	$wpdb->prepare(
		"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s OR option_name LIKE %s",
		$wpdb->esc_like( '_transient_notifypress_abandoned_cart_' ) . '%',
		$wpdb->esc_like( '_transient_timeout_notifypress_abandoned_cart_' ) . '%'
	)
);

// Clear scheduled cron jobs.
wp_clear_scheduled_hook( 'notifypress_abandoned_cart_check' );

// Delete user meta (subscription tokens).
$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	$wpdb->prepare(
		"DELETE FROM {$wpdb->usermeta} WHERE meta_key = %s",
		'notifypress_subscription_token'
	)
);

// Delete the subscriber token and sent-marker stored on WooCommerce orders,
// in both the legacy post meta table and the HPOS order meta table.
$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	$wpdb->prepare(
		"DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ( %s, %s )",
		'_notifypress_subscriber_token',
		'_notifypress_order_notified'
	)
);

$notifypress_orders_meta = $wpdb->prefix . 'wc_orders_meta';

if ( $wpdb->get_var( $wpdb->prepare( 'SHOW TABLES LIKE %s', $wpdb->esc_like( $notifypress_orders_meta ) ) ) === $notifypress_orders_meta ) { // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
	$wpdb->query( // phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->prepare(
			"DELETE FROM {$wpdb->prefix}wc_orders_meta WHERE meta_key IN ( %s, %s )",
			'_notifypress_subscriber_token',
			'_notifypress_order_notified'
		)
	);
}

// Flush rewrite rules.
flush_rewrite_rules();

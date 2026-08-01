<?php
/**
 * PHP minimum-version guard.
 *
 * Loaded manually (not via the composer autoloader) from notifypress.php,
 * and only when the site's PHP version is below the minimum — so this file
 * must stay parseable on old PHP versions.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress;

defined( 'ABSPATH' ) || exit;

/**
 * Show an admin notice when the site's PHP version is below the minimum.
 *
 * @return void
 */
function php_version_notice(): void {
	printf(
		'<div class="notice notice-error"><p>%s</p></div>',
		esc_html(
			sprintf(
				'NotifyPress requires PHP %1$s or higher. Your site is running PHP %2$s.',
				NOTIFYPRESS_MINIMUM_PHP_VERSION,
				PHP_VERSION
			)
		)
	);
}

/**
 * Deactivate the plugin and halt activation when the PHP version is too low.
 *
 * @return void
 */
function activation_php_version_error(): void {
	if ( function_exists( 'deactivate_plugins' ) ) {
		deactivate_plugins( plugin_basename( NOTIFYPRESS_PLUGIN_FILE ) );
	}

	wp_die(
		esc_html(
			sprintf(
				'NotifyPress requires PHP %1$s or higher. Your site is running PHP %2$s.',
				NOTIFYPRESS_MINIMUM_PHP_VERSION,
				PHP_VERSION
			)
		),
		esc_html__( 'NotifyPress activation failed', 'notifypress' ),
		array( 'back_link' => true )
	);
}

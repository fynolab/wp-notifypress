<?php
/**
 * PHP minimum-version guard.
 *
 * Loaded manually from notifypress.php before the composer autoloader,
 * so this file must stay parseable on old PHP versions.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress;

defined( 'ABSPATH' ) || exit;

/**
 * Checks the site's PHP version and surfaces the failure UI when too low.
 */
class PhpVersionCheck {
	/**
	 * Check the site's PHP version, registering the failure hooks if too low.
	 *
	 * @return bool Whether the site's PHP version meets the minimum.
	 */
	public static function passes(): bool {
		if ( version_compare( PHP_VERSION, NOTIFYPRESS_MINIMUM_PHP_VERSION, '>=' ) ) {
			return true;
		}

		register_activation_hook( NOTIFYPRESS_PLUGIN_FILE, array( self::class, 'activation_error' ) );
		add_action( 'admin_notices', array( self::class, 'admin_notice' ) );

		return false;
	}

	/**
	 * Show an admin notice when the site's PHP version is below the minimum.
	 *
	 * @return void
	 */
	public static function admin_notice(): void {
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
	public static function activation_error(): void {
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
}

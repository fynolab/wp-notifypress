<?php
/**
 * Plugin Name: NotifyPress
 * Plugin URI: https://notifypress.com
 * Description: A web push notification plugin for WordPress.
 * Version: 1.0.0
 * Text Domain: notifypress
 * Author: Fynolab
 * Author URI: https://notifypress.com
 * License: GPL-2.0+
 * License URI: https://www.gnu.org/licenses/gpl-2.0.txt
 * Requires at least: 6.0
 * Requires PHP: 8.1
 *
 * @package Fynolab\NotifyPress
 */

declare(strict_types=1);

namespace Fynolab\NotifyPress;

defined( 'ABSPATH' ) || exit;
defined( 'SERVICE_DIR' ) || define( 'SERVICE_DIR', __DIR__ . '/src/Services/' );
defined( 'NOTIFYPRESS_PLUGIN_FILE' ) || define( 'NOTIFYPRESS_PLUGIN_FILE', __FILE__ );
defined( 'ASSETS_DIR' ) || define( 'ASSETS_DIR', __DIR__ . '/assets/' );
defined( 'ASSETS_URL' ) || define( 'ASSETS_URL', plugin_dir_url( __FILE__ ) . 'assets/' );
defined( 'NOTIFYPRESS_MINIMUM_PHP_VERSION' ) || define( 'NOTIFYPRESS_MINIMUM_PHP_VERSION', '8.1' );

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
		deactivate_plugins( plugin_basename( __FILE__ ) );
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

if ( version_compare( PHP_VERSION, NOTIFYPRESS_MINIMUM_PHP_VERSION, '<' ) ) {
	register_activation_hook( __FILE__, __NAMESPACE__ . '\\activation_php_version_error' );
	add_action( 'admin_notices', __NAMESPACE__ . '\\php_version_notice' );
	return;
}

require_once __DIR__ . '/vendor/autoload.php';

App::run();

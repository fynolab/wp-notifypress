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

require_once __DIR__ . '/src/PhpVersionCheck.php';

if ( ! php_version_check() ) {
	return;
}

require_once __DIR__ . '/vendor/autoload.php';

App::run();

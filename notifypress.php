<?php
/**
 * Plugin Name: NotifyPress
 * Plugin URI: https://notifypress.com
 * Description: Send web push notifications to your visitors with campaigns, automations, segments and analytics, right from WordPress.
 * Version: 1.1.1
 * Text Domain: notifypress
 * Author: Fynolab
 * Author URI: https://fynolab.com
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Requires at least: 6.0
 * Requires PHP: 8.1
 *
 * @package Fynolab\NotifyPress
 */

declare(strict_types=1);

namespace Fynolab\NotifyPress;

defined( 'ABSPATH' ) || exit;
defined( 'NOTIFYPRESS_PLUGIN_FILE' ) || define( 'NOTIFYPRESS_PLUGIN_FILE', __FILE__ );
defined( 'NOTIFYPRESS_ASSETS_DIR' ) || define( 'NOTIFYPRESS_ASSETS_DIR', __DIR__ . '/assets/' );
defined( 'NOTIFYPRESS_ASSETS_URL' ) || define( 'NOTIFYPRESS_ASSETS_URL', plugin_dir_url( __FILE__ ) . 'assets/' );
defined( 'NOTIFYPRESS_MINIMUM_PHP_VERSION' ) || define( 'NOTIFYPRESS_MINIMUM_PHP_VERSION', '8.1' );

require_once __DIR__ . '/src/PhpVersionCheck.php';

if ( ! PhpVersionCheck::passes() ) {
	return;
}

require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/src/Helpers.php';

App::run();

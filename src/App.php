<?php
/**
 * App bootstrap.
 *
 * @package Fynolab\NotifyPress
 */

declare(strict_types=1);

namespace Fynolab\NotifyPress;

defined( 'ABSPATH' ) || exit;

/**
 * App class.
 */
class App {

	/**
	 * Register plugin hooks.
	 */
	private function __construct() {
		register_activation_hook( NOTIFYPRESS_PLUGIN_FILE, array( $this, 'on_plugin_active' ) );
		// Not plugins_loaded: services read settings, whose defaults are
		// translated, and WordPress 6.7+ warns when translations load before init.
		add_action( 'init', array( $this, 'register_services' ), 0 );
	}

	/**
	 * On plugin active.
	 *
	 * @return void
	 */
	public function on_plugin_active(): void {
		Installer::run();
	}

	/**
	 * Register services.
	 *
	 * @return void
	 */
	public function register_services(): void {
		foreach ( $this->get_services() as $service ) {
			$service::register();
		}
	}

	/**
	 * Get services.
	 *
	 * @return array
	 */
	private function get_services(): array {
		return apply_filters(
			'notifypress_register_services',
			array(
				Services\Menus\Menus::class,
				Services\WC\WC::class,
				Services\NewPost\NewPost::class,
				Services\Settings\Settings::class,
				Services\NotifyPress\NotifyPress::class,
				Services\PWA\PWA::class,
			)
		);
	}

	/**
	 * Run the app.
	 *
	 * @return void
	 */
	public static function run(): void {
		new self();
	}
}

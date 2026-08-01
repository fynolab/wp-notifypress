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
		add_action( 'activated_plugin', array( $this, 'maybe_redirect_to_setup_after_activation' ), 10, 2 );
		add_action( 'plugins_loaded', array( $this, 'register_services' ) );
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
	 * Redirect to setup immediately after this plugin is activated.
	 *
	 * @param  string $plugin  Activated plugin basename.
	 * @param  bool   $network_wide  Whether the plugin was network activated.
	 *
	 * @return void
	 */
	public function maybe_redirect_to_setup_after_activation( string $plugin, bool $network_wide = false ): void {
		if ( plugin_basename( NOTIFYPRESS_PLUGIN_FILE ) !== $plugin ) {
			return;
		}

		if ( $network_wide || is_network_admin() || wp_doing_ajax() ) {
			return;
		}

		if ( Services\Settings\Settings::get( 'setupCompleted', false ) ) {
			delete_option( Installer::SETUP_REDIRECT_OPTION );
			return;
		}

		wp_safe_redirect( admin_url( 'admin.php?page=notifypress#/setup' ) );
		exit;
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

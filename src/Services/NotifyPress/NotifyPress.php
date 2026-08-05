<?php
/**
 * NotifyPress app-proxy service.
 *
 * @package Fynolab\NotifyPress\Services\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\NotifyPress;

use Fynolab\NotifyPress\Interfaces\Service;
use Fynolab\NotifyPress\Services\NotifyPress\Rest\ProxyController;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the admin's app-proxy REST controller, which attaches the site's
 * API token server-side so it never reaches the page.
 *
 * This class also carried two front-end AJAX endpoints
 * (`notifypress_update_subscription`, `notifypress_get_recent_notifications`).
 * They existed for the plugin's own opt-in prompt, which the app-served widget
 * (`Assets::enqueue_widget()`) replaced — the widget talks to the app's public
 * API directly, so both were unauthenticated `nopriv` surface with no caller.
 */
class NotifyPress implements Service {
	/**
	 * Register hooks.
	 */
	public function __construct() {
		$this->hooks();
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
	}

	/**
	 * Register the app-proxy REST controller.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		( new ProxyController() )->register_routes();
	}

	/**
	 * Register the service.
	 *
	 * @return void
	 */
	public static function register(): void {
		new self();
	}
}

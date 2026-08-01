<?php
/**
 * Settings REST controller.
 *
 * @package Fynolab\NotifyPress\Services\Settings\Rest
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\Settings\Rest;

use Fynolab\NotifyPress\Interfaces\RestController;
use Fynolab\NotifyPress\Services\Settings\Settings;
use Fynolab\NotifyPress\Services\Settings\SettingsRepository;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Exposes the plugin settings option as `notifypress/v1/settings` (GET/POST).
 */
class SettingsController implements RestController {
	/**
	 * Register the controller's REST routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			'notifypress/v1',
			'/settings',
			array(
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( $this, 'get_settings' ),
					'permission_callback' => array( $this, 'permission_check' ),
				),
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( $this, 'update_settings' ),
					'permission_callback' => array( $this, 'permission_check' ),
				),
			)
		);
	}

	/**
	 * Whether the current user may read/write plugin settings.
	 *
	 * @return bool
	 */
	public function permission_check(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Get the current settings.
	 *
	 * @param WP_REST_Request $request The REST request.
	 *
	 * @return WP_REST_Response
	 */
	public function get_settings( WP_REST_Request $request ): WP_REST_Response {
		return new WP_REST_Response( Settings::for_frontend(), 200 );
	}

	/**
	 * Sanitize and persist updated settings.
	 *
	 * @param WP_REST_Request $request The REST request.
	 *
	 * @return WP_REST_Response
	 */
	public function update_settings( WP_REST_Request $request ): WP_REST_Response {
		$params = $request->get_json_params();

		if ( empty( $params ) ) {
			$params = $request->get_params();
		}

		SettingsRepository::update( is_array( $params ) ? $params : array() );

		return new WP_REST_Response( Settings::for_frontend(), 200 );
	}
}

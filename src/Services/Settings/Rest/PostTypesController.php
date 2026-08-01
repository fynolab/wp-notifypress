<?php
/**
 * Post types REST controller.
 *
 * @package Fynolab\NotifyPress\Services\Settings\Rest
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\Settings\Rest;

use Fynolab\NotifyPress\Interfaces\RestController;
use Fynolab\NotifyPress\Services\Settings\PostTypeOptions;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Exposes the site's public post types as `notifypress/v1/post-types` (GET),
 * for the "new post" notification settings picker.
 */
class PostTypesController implements RestController {
	/**
	 * Register the controller's REST routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			'notifypress/v1',
			'/post-types',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( $this, 'get_post_types' ),
				'permission_callback' => array( $this, 'permission_check' ),
			)
		);
	}

	/**
	 * Whether the current user may read the site's post types.
	 *
	 * @return bool
	 */
	public function permission_check(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * List public post types.
	 *
	 * @param WP_REST_Request $request The REST request.
	 *
	 * @return WP_REST_Response
	 */
	public function get_post_types( WP_REST_Request $request ): WP_REST_Response {
		return new WP_REST_Response( PostTypeOptions::choices(), 200 );
	}
}

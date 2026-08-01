<?php
/**
 * REST controller interface
 *
 * @package NotifyPress\App\Interfaces
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Interfaces;

defined( 'ABSPATH' ) || exit;

interface RestController {
	/**
	 * Register the controller's REST routes.
	 *
	 * @return void
	 */
	public function register_routes(): void;
}

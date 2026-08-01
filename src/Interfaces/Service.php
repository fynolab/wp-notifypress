<?php
/**
 * Service interface
 *
 * @package NotifyPress\App\Interfaces
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Interfaces;

defined( 'ABSPATH' ) || exit;

interface Service {
	/**
	 * Register the service.
	 *
	 * @return void
	 */
	public static function register(): void;
}

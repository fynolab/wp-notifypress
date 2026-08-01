<?php
/**
 * Observer interface
 *
 * @package NotifyPress\App\Interfaces
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Interfaces;

defined( 'ABSPATH' ) || exit;

interface Observer {
	/**
	 * Register the observer's hooks.
	 *
	 * @return void
	 */
	public function observe(): void;
}

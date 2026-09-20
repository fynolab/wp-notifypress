<?php
/**
 * Helper functions.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Helpers;

// No ABSPATH guard here: this file only declares a namespaced function (no
// side effects when loaded), and it's eagerly required by Composer's "files"
// autoload entry the moment the autoloader initializes — including by CLI
// tooling (phpcs, phpcbf, PHPUnit) that runs before WordPress ever loads.
// A guard here would silently `exit` and kill that tooling.

/**
 * Log the message.
 *
 * @param int|string   $message The message to log.
 * @param array|object $data    Additional context data.
 *
 * @return void
 */
function log( $message, $data = array() ): void {

	if ( ! defined( 'WP_DEBUG' ) || ! WP_DEBUG ) {
		return;
	}

	if ( ! defined( 'WP_DEBUG_LOG' ) || ! WP_DEBUG_LOG ) {
		return;
	}

	$response = array(
		'message' => $message,
	);

	if ( ! empty( $data ) ) {
		$response['data'] = $data;
	}

	// Debug-only logging, gated by WP_DEBUG + WP_DEBUG_LOG above.
	// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log, WordPress.PHP.DevelopmentFunctions.error_log_print_r
	error_log( print_r( $response, true ) );
}

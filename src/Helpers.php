<?php
/**
 * Helper functions.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Helpers;

// Loaded by notifypress.php, not by Composer's "files" autoload: Composer's
// bin proxies (phpcs, phpcbf) load the autoloader outside WordPress, where
// this guard would exit and silently turn linting into a no-op.
defined( 'ABSPATH' ) || exit;

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

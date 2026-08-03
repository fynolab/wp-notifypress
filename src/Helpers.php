<?php
/**
 * Helper functions.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Helpers;

// This file is loaded by Composer's `files` autoloader, so it runs on every
// request — including CLI ones that have no WordPress at all. Bailing out on a
// missing ABSPATH would then take down any Composer-proxied binary the moment
// it loads the autoloader, which is what silently reduced `composer phpcs` to a
// no-op. The guard only needs to stop this file being requested over HTTP.
if ( ! defined( 'ABSPATH' ) && 'cli' !== PHP_SAPI ) {
	exit;
}

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

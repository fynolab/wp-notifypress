<?php
/**
 * The NotifyPress SDK client, built from this site's settings.
 *
 * @package Fynolab\NotifyPress\Services\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\NotifyPress;

use Fynolab\NotifyPress\Api;
use Fynolab\NotifyPress\Services\Settings\Settings;
use NotifyPress\Config;
use NotifyPress\NotifyPress as Sdk;

defined( 'ABSPATH' ) || exit;

/**
 * Single place where the SDK client is constructed.
 *
 * Every call to the app goes through a client built here, so authentication,
 * timeouts and the base URL are decided once instead of being repeated — and
 * disagreed on — at each call site.
 *
 * The SDK picks its own HTTP transport, and inside WordPress that is always
 * `wp_remote_request()`, so requests still honour the site's proxy constants,
 * `http_request_args` filters and `WP_HTTP_BLOCK_EXTERNAL` allowlist.
 */
final class Client {
	/**
	 * Default timeout for a background call, in seconds.
	 */
	public const TIMEOUT = 15.0;

	/**
	 * Timeout for calls made while an admin page is rendering.
	 *
	 * Short on purpose: this blocks the response, so a slow or unreachable app
	 * must cost the page a moment rather than ten seconds.
	 */
	public const ADMIN_TIMEOUT = 5.0;

	/**
	 * The site's API token.
	 *
	 * `apiToken` is canonical; `apiKey` is the older alias kept in sync by the
	 * settings repository, and is read here so a site saved by an older version
	 * of the plugin still authenticates.
	 *
	 * @return string
	 */
	public static function token(): string {
		$token = (string) Settings::get( 'apiToken', '' );

		if ( '' === $token ) {
			$token = (string) Settings::get( 'apiKey', '' );
		}

		return trim( $token );
	}

	/**
	 * Whether this site has been connected to a NotifyPress account.
	 *
	 * @return bool
	 */
	public static function is_configured(): bool {
		return '' !== self::token();
	}

	/**
	 * Build a client, or null when no API token has been saved yet.
	 *
	 * Returning null rather than throwing keeps "not connected yet" — an
	 * ordinary state for a freshly installed plugin — separate from "the call
	 * failed", which the SDK reports as a typed exception.
	 *
	 * @param float $timeout Request timeout in seconds.
	 *
	 * @return Sdk|null
	 */
	public static function make( float $timeout = self::TIMEOUT ): ?Sdk {
		return self::for_token( self::token(), $timeout );
	}

	/**
	 * Build a client for an explicit token rather than the saved one.
	 *
	 * Used when connecting: the settings screen has to prove a freshly pasted
	 * token works before storing it, and at that moment there is nothing saved
	 * to authenticate with.
	 *
	 * @param string $token   The API token to authenticate with.
	 * @param float  $timeout Request timeout in seconds.
	 *
	 * @return Sdk|null
	 */
	public static function for_token( string $token, float $timeout = self::TIMEOUT ): ?Sdk {
		$token = trim( $token );

		if ( '' === $token ) {
			return null;
		}

		return new Sdk(
			Config::make( $token )
				->withBaseUrl( Api::base_url() )
				->withTimeout( $timeout )
		);
	}
}

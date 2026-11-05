<?php
/**
 * NotifyPress app endpoints.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress;

use function Fynolab\NotifyPress\Helpers\log;

defined( 'ABSPATH' ) || exit;

/**
 * The hosted NotifyPress app every install talks to.
 *
 * Every live site uses APP_URL. For testing a release against another
 * deployment (staging, or the app running locally), a site owner can point the
 * plugin elsewhere from wp-config.php:
 *
 *     define( 'NOTIFYPRESS_APP_URL', 'https://staging-app.notifypress.com' );
 *
 * This is deliberately a constant and not a filter or setting: every request
 * carries the site's API token, and a hook would invite plugins or themes to
 * repoint those requests at another host, even by accident. A constant is set
 * once, on purpose, in wp-config.php. (Code running in the same PHP process
 * could still define it, but such code can already read the token directly, so
 * the constant gives it nothing new.) Switching environments keeps the stored
 * token, so reconnect the site after changing the constant.
 */
final class Api {
	/**
	 * The production app, used unless NOTIFYPRESS_APP_URL is set and valid.
	 */
	public const APP_URL = 'https://app.notifypress.com';

	/**
	 * Hosts allowed over plain http, for an app running on a developer machine.
	 */
	private const LOCAL_HOST_SUFFIXES = array( '.test', '.local', '.localhost' );

	/**
	 * Whether the "invalid NOTIFYPRESS_APP_URL" message was logged this request.
	 *
	 * @var bool
	 */
	private static bool $logged_invalid_override = false;

	/**
	 * The app's origin: NOTIFYPRESS_APP_URL when defined and valid, otherwise APP_URL.
	 *
	 * @return string Origin with no trailing slash, e.g. https://app.notifypress.com.
	 */
	public static function app_url(): string {
		if ( ! defined( 'NOTIFYPRESS_APP_URL' ) ) {
			return self::APP_URL;
		}

		$override = self::sanitize_app_url( constant( 'NOTIFYPRESS_APP_URL' ) );

		if ( null === $override ) {
			// Tell a tester why the plugin still talks to production. Logged once
			// per request, and only when WP_DEBUG_LOG is on (see log()).
			if ( ! self::$logged_invalid_override ) {
				self::$logged_invalid_override = true;
				log( 'NOTIFYPRESS_APP_URL is not a valid https origin (http is allowed for local hosts only), so the production app is used.' );
			}

			return self::APP_URL;
		}

		return $override;
	}

	/**
	 * Reduce a configured app URL to a bare origin, or reject it.
	 *
	 * Accepts https URLs, and http only for local development hosts (localhost,
	 * 127.0.0.1 and *.test / *.local / *.localhost). A path of "/" is allowed;
	 * any other path, a query, a fragment or credentials are rejected so the
	 * value can only ever name an origin.
	 *
	 * @param mixed $value The configured value.
	 *
	 * @return string|null The origin, or null when the value is not acceptable.
	 */
	public static function sanitize_app_url( $value ): ?string {
		if ( ! is_string( $value ) ) {
			return null;
		}

		$value = trim( $value );

		if ( '' === $value ) {
			return null;
		}

		$parts = wp_parse_url( $value );

		if ( ! is_array( $parts ) || empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return null;
		}

		if ( isset( $parts['user'] ) || isset( $parts['pass'] ) || isset( $parts['query'] ) || isset( $parts['fragment'] ) ) {
			return null;
		}

		if ( isset( $parts['path'] ) && '' !== $parts['path'] && '/' !== $parts['path'] ) {
			return null;
		}

		$scheme = strtolower( $parts['scheme'] );
		$host   = strtolower( $parts['host'] );

		if ( 1 !== preg_match( '/^[a-z0-9.-]+$/', $host ) ) {
			return null;
		}

		if ( 'https' !== $scheme && ! ( 'http' === $scheme && self::is_local_host( $host ) ) ) {
			return null;
		}

		$port = isset( $parts['port'] ) ? ':' . (int) $parts['port'] : '';

		return $scheme . '://' . $host . $port;
	}

	/**
	 * The base URL every v1 endpoint hangs off.
	 *
	 * @return string
	 */
	public static function base_url(): string {
		return self::app_url() . '/api/v1';
	}

	/**
	 * Build an absolute URL to a v1 API endpoint.
	 *
	 * @param string $path The endpoint path, with or without a leading slash.
	 *
	 * @return string
	 */
	public static function url( string $path ): string {
		return self::base_url() . '/' . ltrim( $path, '/' );
	}

	/**
	 * Build the public widget URL for a site.
	 *
	 * @param string $site_key The site's public key.
	 *
	 * @return string
	 */
	public static function widget_url( string $site_key ): string {
		return self::app_url() . '/widget.js?site_key=' . rawurlencode( $site_key );
	}

	/**
	 * Whether a host is a local development host that may use plain http.
	 *
	 * @param string $host Lower-cased host name.
	 *
	 * @return bool
	 */
	private static function is_local_host( string $host ): bool {
		if ( 'localhost' === $host || '127.0.0.1' === $host ) {
			return true;
		}

		foreach ( self::LOCAL_HOST_SUFFIXES as $suffix ) {
			if ( str_ends_with( $host, $suffix ) ) {
				return true;
			}
		}

		return false;
	}
}

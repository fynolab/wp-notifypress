<?php
/**
 * NotifyPress app endpoints.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress;

defined( 'ABSPATH' ) || exit;

/**
 * The hosted NotifyPress app every install talks to.
 *
 * The app URL is the same for all sites, so it is a constant here rather than
 * a stored setting — there is nothing per-site or user-editable about it.
 */
final class Api {
	public const APP_URL = 'https://app.notifypress.com';

	/**
	 * The base URL every v1 endpoint hangs off.
	 *
	 * @return string
	 */
	public static function base_url(): string {
		return self::APP_URL . '/api/v1';
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
		return self::APP_URL . '/widget.js?site_key=' . rawurlencode( $site_key );
	}
}

<?php
/**
 * The connected site record, as the app knows it.
 *
 * @package Fynolab\NotifyPress\Services\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\NotifyPress;

use Fynolab\NotifyPress\Api;
use Fynolab\NotifyPress\Services\Settings\Settings;
use function Fynolab\NotifyPress\Helpers\log;

defined( 'ABSPATH' ) || exit;

/**
 * Reads `GET /sites/current` — the app's copy of the connected site.
 *
 * Some settings (geolocation, the "powered by" link, the opt-in prompt) live on
 * the site record in the app, not in WP options: they can be changed from the
 * NotifyPress dashboard, or from another install pointing at the same site. The
 * WP option only holds a copy, refreshed when settings are saved here, so the
 * settings screen has to read the app's record to show the truth.
 *
 * The NotifyPress screen calls refresh() on every load, so what it renders is
 * always live. The transient exists for everyone else — the settings REST
 * endpoint and other admin pages read cached(), which is at most a minute
 * behind and costs nothing.
 */
class CurrentSite {
	private const CACHE_TTL = MINUTE_IN_SECONDS;

	/**
	 * The cached site record, without ever hitting the network.
	 *
	 * @return array
	 */
	public static function cached(): array {
		$cached = get_transient( self::cache_key() );

		return is_array( $cached ) ? $cached : array();
	}

	/**
	 * Fetch the site record from the app and cache it.
	 *
	 * Falls back to the cached copy (or an empty array) whenever the app can't
	 * be reached, so a settings page never fails to render over this.
	 *
	 * @return array
	 */
	public static function refresh(): array {
		$api_token = (string) Settings::get( 'apiToken', '' );

		if ( '' === $api_token ) {
			return array();
		}

		$response = wp_remote_get(
			Api::url( 'sites/current' ),
			array(
				'headers' => array(
					'Accept'        => 'application/json',
					'Authorization' => 'Bearer ' . $api_token,
				),
				// Short: this blocks the admin page render, so a slow or down
				// app must cost the page a moment, not ten seconds.
				'timeout' => 5,
			)
		);

		if ( is_wp_error( $response ) || 200 !== wp_remote_retrieve_response_code( $response ) ) {
			log( 'Could not refresh the current site record', $response );

			return self::cached();
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		$site = is_array( $body ) && is_array( $body['data'] ?? null ) ? $body['data'] : array();

		if ( empty( $site ) ) {
			return self::cached();
		}

		set_transient( self::cache_key(), $site, self::CACHE_TTL );

		return $site;
	}

	/**
	 * Drop the cached record — the app's copy just changed, or is about to.
	 *
	 * @return void
	 */
	public static function flush(): void {
		delete_transient( self::cache_key() );
	}

	/**
	 * Cache key, scoped to the API token so reconnecting to a different
	 * account never reuses another site's record.
	 *
	 * @return string
	 */
	private static function cache_key(): string {
		return 'notifypress_current_site_' . md5( (string) Settings::get( 'apiToken', '' ) );
	}
}

<?php
/**
 * Settings storage.
 *
 * @package Fynolab\NotifyPress\Services\Settings
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\Settings;

use Fynolab\NotifyPress\Installer;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the plugin's settings option: defaults, sanitization, persistence,
 * and the invariants that apply whenever settings are updated (regardless
 * of what triggered the update).
 */
class SettingsRepository {
	public const OPTION_KEY      = 'notifypress_settings';
	public const DEFAULT_APP_URL = 'https://app.notifypress.com';

	/**
	 * Get the full settings array, merged with defaults.
	 *
	 * @return array
	 */
	public static function all(): array {
		return array_merge( self::defaults(), self::raw() );
	}

	/**
	 * Get a single setting by key.
	 *
	 * @param string $key           The setting key.
	 * @param mixed  $fallback_value The value to return if the key is not set.
	 *
	 * @return mixed
	 */
	public static function get( string $key, $fallback_value = null ): mixed {
		$settings = self::all();
		return $settings[ $key ] ?? $fallback_value;
	}

	/**
	 * Persist the settings option with any missing defaults filled in.
	 *
	 * @return void
	 */
	public static function ensure_defaults(): void {
		// array_merge, not array_replace_recursive — see update() for why
		// list-type settings need a full replace.
		self::persist( array_merge( self::defaults(), self::raw() ) );
	}

	/**
	 * Sanitize, persist, and return the full settings array after an update.
	 *
	 * @param array $params The raw, unsanitized params.
	 *
	 * @return array
	 */
	public static function update( array $params ): array {
		$current = self::all();
		// A plain array_merge, not array_replace_recursive: sanitize() always
		// returns a complete value for every key (including list-type ones
		// like postNotificationPostTypes), and array_replace_recursive merges
		// numeric-indexed arrays by index rather than replacing them — which
		// would leave stale trailing entries behind when a list shrinks.
		$next = array_merge( $current, self::sanitize( $params ) );

		if ( empty( $next['apiToken'] ) ) {
			$next['connectionStatus'] = 'disconnected';
			$next['connectedSite']    = array();
		}

		$next['apiKey']            = $next['apiToken'];
		$next['siteName']          = $next['connectedSite']['site_name'] ?? $next['siteName'];
		$next['siteUrl']           = $next['connectedSite']['site_url'] ?? $next['siteUrl'];
		$next['enableGeolocation'] = (bool) ( $next['connectedSite']['enable_geolocation'] ?? $next['enableGeolocation'] );
		$next['removePoweredBy']   = (bool) ( $next['connectedSite']['remove_powered_by'] ?? $next['removePoweredBy'] );

		// The /manifest.json rewrite rule is only added when pwaEnabled is
		// true (see PWA::__construct()), so toggling it requires a flush for
		// the route to actually start or stop working.
		$pwa_toggled = (bool) ( $current['pwaEnabled'] ?? false ) !== (bool) ( $next['pwaEnabled'] ?? false );

		self::persist( $next );

		if ( ! empty( $next['setupCompleted'] ) ) {
			delete_option( Installer::SETUP_REDIRECT_OPTION );
		}

		if ( $pwa_toggled ) {
			flush_rewrite_rules();
		}

		do_action( 'notifypress_settings_updated' );

		return self::all();
	}

	/**
	 * The default settings.
	 *
	 * @return array
	 */
	private static function defaults(): array {
		return array(
			'enabled'                            => true,
			'appUrl'                             => self::DEFAULT_APP_URL,
			'apiToken'                           => '',
			'apiKey'                             => '',
			'siteKey'                            => '',
			'connectionStatus'                   => 'disconnected',
			'connectedSite'                      => array(),
			'siteName'                           => get_bloginfo( 'name' ),
			'siteUrl'                            => home_url(),
			'enableGeolocation'                  => true,
			'removePoweredBy'                    => false,
			'welcomeNotificationEnabled'         => true,
			'welcomeNotificationTitle'           => __( 'Welcome!', 'notifypress' ),
			'welcomeNotificationMessage'         => __( 'Thanks for subscribing — we will keep you posted with our latest updates.', 'notifypress' ),
			'welcomeNotificationIcon'            => '',
			'welcomeNotificationUrl'             => home_url(),
			'postNotificationEnabled'            => true,
			'postNotificationAllTypes'           => true,
			'postNotificationPostTypes'          => array(),
			'wcOrderNotificationEnabled'         => true,
			'wcAbandonedCartNotificationEnabled' => true,
			'pwaEnabled'                         => false,
			'setupCompleted'                     => false,
		);
	}

	/**
	 * Sanitize raw request params into a full settings array.
	 *
	 * @param array $params The raw, unsanitized params.
	 *
	 * @return array
	 */
	private static function sanitize( array $params ): array {
		$connected_site = array();

		if ( ! empty( $params['connectedSite'] ) && is_array( $params['connectedSite'] ) ) {
			$connected_site = array(
				'id'                 => isset( $params['connectedSite']['id'] ) ? (int) $params['connectedSite']['id'] : 0,
				'site_name'          => sanitize_text_field( $params['connectedSite']['site_name'] ?? '' ),
				'site_url'           => esc_url_raw( $params['connectedSite']['site_url'] ?? '' ),
				'enable_geolocation' => rest_sanitize_boolean( $params['connectedSite']['enable_geolocation'] ?? false ),
				'remove_powered_by'  => rest_sanitize_boolean( $params['connectedSite']['remove_powered_by'] ?? false ),
			);
		}

		$api_token = sanitize_text_field( $params['apiToken'] ?? $params['apiKey'] ?? '' );
		$site_key  = sanitize_text_field( $params['siteKey'] ?? '' );
		$app_url   = esc_url_raw( $params['appUrl'] ?? self::DEFAULT_APP_URL );

		// Only allow post types that are actually public right now — drops
		// stale slugs left over from a since-deactivated plugin/theme.
		$requested_post_types         = is_array( $params['postNotificationPostTypes'] ?? null ) ? $params['postNotificationPostTypes'] : array();
		$post_notification_post_types = array_values(
			array_intersect(
				array_unique( array_map( 'sanitize_key', $requested_post_types ) ),
				PostTypeOptions::public_names()
			)
		);

		return array(
			'enabled'                            => rest_sanitize_boolean( $params['enabled'] ?? true ),
			'appUrl'                             => untrailingslashit( $app_url ? $app_url : self::DEFAULT_APP_URL ),
			'apiToken'                           => $api_token,
			'apiKey'                             => $api_token,
			'siteKey'                            => $site_key,
			'connectionStatus'                   => sanitize_text_field( $params['connectionStatus'] ?? ( $api_token ? 'connected' : 'disconnected' ) ),
			'connectedSite'                      => $connected_site,
			'siteName'                           => sanitize_text_field( $params['siteName'] ?? get_bloginfo( 'name' ) ),
			'siteUrl'                            => esc_url_raw( $params['siteUrl'] ?? home_url() ),
			'enableGeolocation'                  => rest_sanitize_boolean( $params['enableGeolocation'] ?? true ),
			'removePoweredBy'                    => rest_sanitize_boolean( $params['removePoweredBy'] ?? false ),
			'welcomeNotificationEnabled'         => rest_sanitize_boolean( $params['welcomeNotificationEnabled'] ?? true ),
			'welcomeNotificationTitle'           => sanitize_text_field( $params['welcomeNotificationTitle'] ?? __( 'Welcome!', 'notifypress' ) ),
			'welcomeNotificationMessage'         => sanitize_text_field( $params['welcomeNotificationMessage'] ?? '' ),
			'welcomeNotificationIcon'            => esc_url_raw( $params['welcomeNotificationIcon'] ?? '' ),
			'welcomeNotificationUrl'             => esc_url_raw( $params['welcomeNotificationUrl'] ?? home_url() ),
			'postNotificationEnabled'            => rest_sanitize_boolean( $params['postNotificationEnabled'] ?? true ),
			'postNotificationAllTypes'           => rest_sanitize_boolean( $params['postNotificationAllTypes'] ?? true ),
			'postNotificationPostTypes'          => $post_notification_post_types,
			'wcOrderNotificationEnabled'         => rest_sanitize_boolean( $params['wcOrderNotificationEnabled'] ?? true ),
			'wcAbandonedCartNotificationEnabled' => rest_sanitize_boolean( $params['wcAbandonedCartNotificationEnabled'] ?? true ),
			'pwaEnabled'                         => rest_sanitize_boolean( $params['pwaEnabled'] ?? false ),
			'setupCompleted'                     => rest_sanitize_boolean( $params['setupCompleted'] ?? false ),
		);
	}

	/**
	 * Persist the settings option (site option on multisite).
	 *
	 * @param array $options The full settings array to persist.
	 *
	 * @return void
	 */
	private static function persist( array $options ): void {
		if ( is_multisite() ) {
			update_site_option( self::OPTION_KEY, $options );
			return;
		}

		update_option( self::OPTION_KEY, $options );
	}

	/**
	 * Get the raw, persisted settings option.
	 *
	 * @return array
	 */
	private static function raw(): array {
		return is_multisite()
			? get_site_option( self::OPTION_KEY, array() )
			: get_option( self::OPTION_KEY, array() );
	}
}

<?php
/**
 * Settings service
 *
 * @package Fynolab\NotifyPress\Services\Settings
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\Settings;

use Fynolab\NotifyPress\Interfaces\Service;
use Fynolab\NotifyPress\Services\NotifyPress\CurrentSite;
use Fynolab\NotifyPress\Services\Settings\Rest\PostTypesController;
use Fynolab\NotifyPress\Services\Settings\Rest\SettingsController;
use Fynolab\NotifyPress\Services\WC\WC;

defined( 'ABSPATH' ) || exit;

/**
 * Public facade for plugin settings. Storage lives in `SettingsRepository`;
 * REST endpoints live under `Rest\`. Kept as the single `Settings::get()`/
 * `Settings::all()` entry point every other service already depends on.
 */
class Settings implements Service {
	/**
	 * Ensure defaults are persisted and register the REST routes.
	 *
	 * Defaults are filled on `init` at a late priority, not here: this service
	 * is constructed on `plugins_loaded`, before custom post types exist, and
	 * the post-notification defaults/upgrades need the full post type list.
	 */
	public function __construct() {
		add_action( 'init', array( SettingsRepository::class, 'ensure_defaults' ), 20 );
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
		// Saving here PUTs the site record to the app, so the cached copy of
		// it is stale the moment the save succeeds.
		add_action( 'notifypress_settings_updated', array( CurrentSite::class, 'flush' ) );
	}

	/**
	 * Register the settings-related REST controllers.
	 *
	 * @return void
	 */
	public function register_rest_routes(): void {
		( new SettingsController() )->register_routes();
		( new PostTypesController() )->register_routes();
	}

	/**
	 * Get the full settings array, merged with defaults.
	 *
	 * @return array
	 */
	public static function all(): array {
		return SettingsRepository::all();
	}

	/**
	 * The full settings array plus read-only, non-persisted environment
	 * flags the settings UI needs (e.g. whether a required third-party
	 * plugin is active). Used both by the REST endpoint and by the
	 * localized script bootstrap (`Assets::register_scripts()`) so the two
	 * can never drift out of sync with each other.
	 *
	 * @return array
	 */
	public static function for_frontend(): array {
		$settings = array_merge(
			self::all(),
			array(
				'wooCommerceActive' => WC::is_active(),
			)
		);

		// The "powered by" link lives on the app's site record; the option only
		// holds a copy. Overlay the app's value (cached — see CurrentSite) so
		// the screen paints the truth on first render instead of showing the
		// stale copy and correcting itself a moment later. This matters more
		// now that the app coerces the flag off for free plans: without the
		// overlay a lapsed site would keep showing the switch as on.
		$site = CurrentSite::cached();

		if ( ! empty( $site ) ) {
			$settings['removePoweredBy'] = (bool) ( $site['remove_powered_by'] ?? $settings['removePoweredBy'] );
			$settings['connectedSite']   = array_merge( (array) ( $settings['connectedSite'] ?? array() ), $site );
		}

		// The API token is a full-access credential and must not reach the
		// browser. This is the one place the settings are prepared for the
		// page — both the REST endpoint and the script localisation go through
		// here — so masking here covers both.
		//
		// A mask rather than removal: the admin app treats the value as a
		// truthiness check ("is this site connected?") and as a react-query
		// cache key, and both keep working unchanged. Submitting the mask back
		// is understood as "unchanged" (see SettingsRepository::sanitize).
		$masked                = SettingsRepository::mask_token( (string) ( $settings['apiToken'] ?? '' ) );
		$settings['apiToken']  = $masked;
		$settings['apiKey']    = $masked;
		$settings['connected'] = '' !== $masked;

		return $settings;
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
		return SettingsRepository::get( $key, $fallback_value );
	}

	/**
	 * Register the service.
	 *
	 * @return void
	 */
	public static function register(): void {
		new self();
	}
}

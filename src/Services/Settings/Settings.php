<?php
/**
 * Settings service
 *
 * @package Fynolab\NotifyPress\Services\Settings
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\Settings;

use Fynolab\NotifyPress\Interfaces\Service;
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
	 */
	public function __construct() {
		SettingsRepository::ensure_defaults();
		add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
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
		return array_merge(
			self::all(),
			array(
				'wooCommerceActive' => WC::is_active(),
			)
		);
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

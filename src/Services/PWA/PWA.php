<?php
/**
 * PWA service.
 *
 * @package Fynolab\NotifyPress\Services\PWA
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\PWA;

use Fynolab\NotifyPress\Services\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * PWA service for making the site a Progressive Web App
 */
class PWA {
	const MANIFEST      = 'notifypress_manifest';
	const MANIFEST_JSON = 'manifest.json';

	/**
	 * Constructor
	 */
	public function __construct() {
		if ( ! Settings::get( 'pwaEnabled', false ) ) {
			return;
		}

		add_action( 'wp_head', array( $this, 'add_pwa_meta_tags' ) );
		add_action( 'generate_rewrite_rules', array( $this, 'add_rewrite_rules' ) );
		add_action( 'parse_request', array( $this, 'serve_manifest' ) );
	}

	/**
	 * Register PWA functionality
	 *
	 * @return void
	 */
	public static function register(): void {
		new self();
	}

	/**
	 * Add PWA meta tags to head
	 *
	 * @return void
	 */
	public function add_pwa_meta_tags(): void {
		if ( is_admin() ) {
			return;
		}

		$manifest_url = site_url( '/' . self::MANIFEST_JSON );
		$settings     = Settings::all();
		$app_name     = $settings['pwa']['app_name'] ?? get_bloginfo( 'name' );
		$theme_color  = $settings['pwa']['theme_color'] ?? '#000000';

		echo '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' . "\n";
		echo '<meta name="theme-color" content="' . esc_attr( $theme_color ) . '">' . "\n";
		echo '<link rel="manifest" href="' . esc_url( $manifest_url ) . '">' . "\n";

		// iOS specific meta tags.
		echo '<meta name="apple-mobile-web-app-capable" content="yes">' . "\n";
		echo '<meta name="apple-mobile-web-app-status-bar-style" content="default">' . "\n";
		echo '<meta name="apple-mobile-web-app-title" content="' . esc_attr( $app_name ) . '">' . "\n";

		// Apple touch icons.
		$icon_url = $this->get_app_icon_url();

		if ( $icon_url ) {
			echo '<link rel="apple-touch-icon" href="' . esc_url( $icon_url ) . '">' . "\n";
			echo '<link rel="apple-touch-icon" sizes="152x152" href="' . esc_url( $icon_url ) . '">' . "\n";
			echo '<link rel="apple-touch-icon" sizes="180x180" href="' . esc_url( $icon_url ) . '">' . "\n";
			echo '<link rel="apple-touch-icon" sizes="167x167" href="' . esc_url( $icon_url ) . '">' . "\n";
		}

		// Microsoft tiles.
		echo '<meta name="msapplication-TileColor" content="' . esc_attr( $theme_color ) . '">' . "\n";

		if ( $icon_url ) {
			echo '<meta name="msapplication-TileImage" content="' . esc_url( $icon_url ) . '">' . "\n";
		}
	}

	/**
	 * Add rewrite rules.
	 *
	 * @param \WP_Rewrite $wp_rewrite The WP_Rewrite instance.
	 *
	 * @return void
	 */
	public function add_rewrite_rules( \WP_Rewrite $wp_rewrite ): void {
		$rules = array(
			'manifest.json' => 'index.php?' . self::MANIFEST . '=1',
		);

		$wp_rewrite->rules = $rules + $wp_rewrite->rules;
	}

	/**
	 * Serve the manifest file
	 *
	 * @return void
	 */
	public function serve_manifest(): void {
		if ( wp_is_json_request() || wp_is_jsonp_request() ) {
			return;
		}

		$requested_url = wp_parse_url( untrailingslashit( get_self_link() ), PHP_URL_PATH );

		if ( '/' . self::MANIFEST_JSON !== $requested_url ) {
			return;
		}

		header( 'Content-Type: application/manifest+json; charset=utf-8' );
		header( 'X-Content-Type-Options: nosniff' );
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo wp_json_encode( $this->get_manifest_data() );
		exit;
	}

	/**
	 * Get manifest data
	 *
	 * @return array
	 */
	private function get_manifest_data(): array {
		$settings         = Settings::all();
		$app_name         = sanitize_text_field( $settings['pwa']['app_name'] ?? '' );
		$app_name         = $app_name ? $app_name : get_bloginfo( 'name' );
		$app_short_name   = sanitize_text_field( $settings['pwa']['app_short_name'] ?? '' );
		$app_short_name   = $app_short_name ? $app_short_name : $app_name;
		$app_description  = sanitize_text_field( $settings['pwa']['app_description'] ?? '' );
		$app_description  = $app_description ? $app_description : get_bloginfo( 'description' );
		$theme_color      = sanitize_hex_color( $settings['pwa']['theme_color'] ?? '' );
		$theme_color      = $theme_color ? $theme_color : '#000000';
		$background_color = sanitize_hex_color( $settings['pwa']['background_color'] ?? '' );
		$background_color = $background_color ? $background_color : '#ffffff';
		$start_url        = esc_url_raw( $settings['pwa']['start_url'] ?? '' );
		$start_url        = $start_url ? $start_url : '/';

		$manifest = array(
			'name'             => $app_name,
			'short_name'       => $app_short_name,
			'description'      => $app_description,
			'start_url'        => $start_url,
			'display'          => 'standalone',
			'orientation'      => 'portrait',
			'theme_color'      => $theme_color,
			'background_color' => $background_color,
			'scope'            => '/',
		);

		$icon_url = $this->get_app_icon_url();

		if ( $icon_url ) {
			$manifest['icons'] = array(
				array(
					'src'     => $icon_url,
					'sizes'   => '192x192',
					'type'    => 'image/png',
					'purpose' => 'any maskable',
				),
				array(
					'src'     => $icon_url,
					'sizes'   => '512x512',
					'type'    => 'image/png',
					'purpose' => 'any maskable',
				),
			);
		}

		return apply_filters( 'notifypress_pwa_manifest', $manifest );
	}

	/**
	 * Get app icon URL
	 *
	 * @return string|false
	 */
	private function get_app_icon_url(): string|false {
		$settings = Settings::all();

		if ( ! empty( $settings['pwa']['app_icon'] ) ) {
			return esc_url_raw( $settings['pwa']['app_icon'] );
		}

		// Fallback to site icon.
		$site_icon_id = get_option( 'site_icon' );

		if ( $site_icon_id ) {
			return wp_get_attachment_image_url( absint( $site_icon_id ), 'full' );
		}

		return false;
	}
}

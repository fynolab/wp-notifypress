<?php
/**
 * Assets service.
 *
 * @package Fynolab\NotifyPress
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress;

use Fynolab\NotifyPress\Services\NewPost\PostNotification;
use Fynolab\NotifyPress\Services\NotifyPress\CurrentSite;
use Fynolab\NotifyPress\Services\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Registers, enqueues, and localizes the plugin's scripts and styles,
 * and serves the service worker.
 */
class Assets {
	const SCRIPT_HANDLE         = 'notifypress-script';
	const STYLE_HANDLE          = 'notifypress-style';
	const OBJECT_NAME           = 'notifypress';
	const NONCE_ACTION          = 'notifypress-nonce';
	const REST_NONCE            = 'wp_rest';
	const SERVICE_WORKER_JS     = 'service-worker.js';
	const SERVICE_WORKER_HANDLE = 'notifypress_service_worker';
	const WIDGET_HANDLE         = 'notifypress-widget';

	/**
	 * Register the asset-related hooks.
	 */
	public function __construct() {
		add_action( 'generate_rewrite_rules', array( $this, 'add_rewrite_rules' ) );
		add_action( 'parse_request', array( $this, 'request' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'register_scripts' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_widget' ) );
		add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_editor_scripts' ) );
		add_filter( 'script_loader_tag', array( $this, 'add_async_to_widget' ), 10, 2 );
	}

	/**
	 * Serve the bundled service worker at /service-worker.js.
	 *
	 * @return void
	 */
	public function request(): void {
		if ( wp_is_json_request() || wp_is_jsonp_request() ) {
			return;
		}

		$requested_url = wp_parse_url( untrailingslashit( get_self_link() ), PHP_URL_PATH );

		if ( '/' . self::SERVICE_WORKER_JS !== $requested_url ) {
			return;
		}

		$service_worker = ASSETS_DIR . self::SERVICE_WORKER_JS;

		if ( ! is_readable( $service_worker ) ) {
			return;
		}

		header( 'Content-Type: application/javascript; charset=utf-8' );
		header( 'X-Content-Type-Options: nosniff' );
		// Local, bundled file (not user input); already reviewed as safe to output raw.
		echo file_get_contents( $service_worker ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents, WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}

	/**
	 * Add the service worker rewrite rule.
	 *
	 * @param \WP_Rewrite $wp_rewrite The WP_Rewrite instance.
	 *
	 * @return void
	 */
	public function add_rewrite_rules( \WP_Rewrite $wp_rewrite ): void {
		$rules = array(
			'service-worker.js' => 'index.php?' . self::SERVICE_WORKER_HANDLE . '=1',
		);

		$wp_rewrite->rules = $rules + $wp_rewrite->rules;
	}

	/**
	 * Enqueue a previously registered script.
	 *
	 * @param string $script_name The registered script handle.
	 *
	 * @return void
	 */
	public static function enqueue_script( string $script_name ): void {
		wp_enqueue_script( $script_name );
	}

	/**
	 * Enqueue a previously registered style, plus wp-components.
	 *
	 * @param string $style_name The registered style handle.
	 *
	 * @return void
	 */
	public static function enqueue_style( string $style_name ): void {
		wp_enqueue_style( $style_name );
		wp_enqueue_style( 'wp-components' );
	}

	/**
	 * Register the main and editor scripts/styles and localize their data.
	 *
	 * @param string $hook_suffix The current admin page hook suffix.
	 *
	 * @return void
	 */
	public function register_scripts( string $hook_suffix = '' ): void {
		if ( 'toplevel_page_notifypress' === $hook_suffix ) {
			// Must run on admin_enqueue_scripts (before wp_head prints scripts),
			// not inside the page render callback — wp_print_media_templates()
			// hooks to admin_footer conditionally on this being enqueued early,
			// and the media modal's Backbone views throw
			// "Cannot read properties of undefined (reading 'Region')" if the
			// templates it needs weren't printed yet.
			wp_enqueue_media();

			// Only the NotifyPress screen shows the app's site record, so only
			// it pays for refreshing that record. Every other admin page reads
			// whatever this left cached (Settings::for_frontend()).
			CurrentSite::refresh();
		}

		$script_paths = array(
			'main'   => ASSETS_DIR . 'main-dist/main.asset.php',
			'editor' => ASSETS_DIR . 'editor-dist/editor.asset.php',
		);

		foreach ( $script_paths as $script_name => $script_path ) {
			if ( ! is_readable( $script_path ) ) {
				continue;
			}

			$script         = require $script_path;
			$dependency     = array_merge( $script['dependencies'], array( 'jquery' ) );
			$script_version = $script['version'];
			$style_path     = ASSETS_DIR . "{$script_name}-dist/style-{$script_name}.css";
			// wp-scripts derives $script['version'] from the JS bundle only, so a
			// CSS-only rebuild keeps the same query string and browsers keep
			// serving stale CSS from cache. Version the stylesheet by its own
			// mtime instead.
			$style_version = is_readable( $style_path ) ? (string) filemtime( $style_path ) : $script_version;

			wp_register_script( self::SCRIPT_HANDLE . "-{$script_name}", ASSETS_URL . "{$script_name}-dist/{$script_name}.js", $dependency, $script_version, true );
			wp_register_style( self::STYLE_HANDLE . "-{$script_name}", ASSETS_URL . "{$script_name}-dist/style-{$script_name}.css", array(), $style_version );

			// No app URL here — it is a fixed constant the JS bundle already
			// knows (assets/src/lib/app.ts).
			$localized_data = array(
				'ajaxUrl'   => admin_url( 'admin-ajax.php' ),
				'nonce'     => wp_create_nonce( self::NONCE_ACTION ),
				'restUrl'   => rest_url( 'notifypress/v1' ),
				'restNonce' => wp_create_nonce( self::REST_NONCE ),
				'siteUrl'   => site_url(),
			);

			// The 'main' script only runs on the manage_options-gated settings
			// page. It receives the full settings, but for_frontend() masks the
			// API token before they leave the server, so no credential is
			// embedded in the page. The 'editor' script runs for any user who
			// can open the block editor (Authors, Contributors) and only needs
			// the nonce, so it gets no settings at all.
			//
			// Uses for_frontend(), not $settings — this seeds react-query's
			// initial cache (see App.tsx), so it must carry the same
			// environment flags (e.g. wooCommerceActive) the REST endpoint
			// returns, or the UI shows stale/wrong values until the query's
			// staleTime lapses and it refetches.
			if ( 'main' === $script_name ) {
				$localized_data['settings'] = Settings::for_frontend();
			}

			// The editor panel needs enough to render the notification preview
			// and decide whether the post-publish notification applies at all —
			// site identity, the app's field limits, and the two global
			// post-notification switches. No credentials.
			if ( 'editor' === $script_name ) {
				$localized_data['editor'] = array(
					'siteName'    => get_bloginfo( 'name' ),
					'siteHost'    => (string) wp_parse_url( home_url(), PHP_URL_HOST ),
					'titleMax'    => PostNotification::TITLE_MAX,
					'messageMax'  => PostNotification::MESSAGE_MAX,
					// Post types that actually notify, per the "all public post
					// types" / explicit-list setting — the panel hides itself
					// for anything not in here.
					'postTypes'   => array_values( array_filter( PostNotification::post_types(), array( PostNotification::class, 'post_type_is_selected' ) ) ),
					'enabled'     => (bool) Settings::get( 'postNotificationEnabled', true ),
					'connected'   => '' !== (string) Settings::get( 'apiToken', '' ),
					'settingsUrl' => admin_url( 'admin.php?page=notifypress#/settings?tab=wordpress' ),
				);
			}

			wp_localize_script(
				self::SCRIPT_HANDLE . "-{$script_name}",
				self::OBJECT_NAME,
				$localized_data
			);
		}
	}

	/**
	 * Enqueue the public-facing widget script from the NotifyPress app.
	 *
	 * @return void
	 */
	public function enqueue_widget(): void {
		if ( is_admin() || $this->is_turned_off() ) {
			return;
		}

		$settings = Settings::all();
		$site_key = $settings['siteKey'] ?? '';

		if ( empty( $site_key ) ) {
			return;
		}

		wp_enqueue_script(
			self::WIDGET_HANDLE,
			Api::widget_url( $site_key ),
			array(),
			null, // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- third-party asset; versioned by app.notifypress.com, not by this plugin.
			false
		);
	}

	/**
	 * Add the async attribute to the widget script tag.
	 *
	 * @param string $tag    The full script tag markup.
	 * @param string $handle The script handle being printed.
	 *
	 * @return string
	 */
	public function add_async_to_widget( string $tag, string $handle ): string {
		if ( self::WIDGET_HANDLE !== $handle ) {
			return $tag;
		}

		return str_replace( '<script ', '<script async ', $tag );
	}

	/**
	 * Whether the plugin is turned off in settings.
	 *
	 * @return bool
	 */
	public function is_turned_off(): bool {
		$settings = Settings::all();

		return empty( $settings['enabled'] );
	}

	/**
	 * Enqueue the block editor script.
	 *
	 * @return void
	 */
	public function enqueue_editor_scripts(): void {
		wp_enqueue_script( self::SCRIPT_HANDLE . '-editor' );
		wp_enqueue_style( self::STYLE_HANDLE . '-editor' );
	}
}

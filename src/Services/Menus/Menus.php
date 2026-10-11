<?php
/**
 * Menus service
 *
 * @package Fynolab\NotifyPress\Services\Menus
 */

declare(strict_types=1);

namespace Fynolab\NotifyPress\Services\Menus;

use Fynolab\NotifyPress\Assets;
use Fynolab\NotifyPress\Installer;
use Fynolab\NotifyPress\Interfaces\Service;
use Fynolab\NotifyPress\Services\Settings\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the admin menu and the NotifyPress admin page shell.
 */
class Menus implements Service {

	private const POSITION = 30;
	private const CAP      = 'manage_options';
	private const ICON     = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNyIgY3k9IjMxIiByPSI4LjUiIGZpbGw9IiNhN2FhYWQiLz48cGF0aCBkPSJNIDMyLjk0IDI2LjczIEEgMTYuNSAxNi41IDAgMCAwIDIxLjI3IDE1LjA2IiBmaWxsPSJub25lIiBzdHJva2U9IiNhN2FhYWQiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+PHBhdGggZD0iTSA0MS40MyAyMi4xMSBBIDI2IDI2IDAgMCAwIDI1Ljg5IDYuNTciIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2E3YWFhZCIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiIG9wYWNpdHk9IjAuNDUiLz48L3N2Zz4=';
	private const SLUG     = 'notifypress';

	/**
	 * The assets service.
	 *
	 * @var Assets
	 */
	private readonly Assets $assets;

	/**
	 * Set up the menu service.
	 *
	 * @param Assets $assets The assets service.
	 */
	private function __construct( Assets $assets ) {
		$this->assets = $assets;
		$this->hooks();
	}

	/**
	 * Register hooks.
	 *
	 * @return void
	 */
	public function hooks(): void {
		add_action( 'admin_menu', array( $this, 'add_menus' ) );
		add_action( 'admin_init', array( $this, 'maybe_redirect_to_setup' ) );

		// Suppress third-party notices only on the NotifyPress admin page.
		add_action( 'load-toplevel_page_' . self::SLUG, array( $this, 'suppress_third_party_notices' ) );
	}

	/**
	 * Register the top-level admin menu and its hash-routed submenu items.
	 *
	 * @return void
	 */
	public function add_menus(): void {
		if ( ! current_user_can( self::CAP ) ) {
			return;
		}

		add_menu_page(
			__( 'NotifyPress', 'notifypress' ),
			__( 'NotifyPress', 'notifypress' ),
			self::CAP,
			self::SLUG,
			array( $this, 'render_page' ),
			self::ICON,
			self::POSITION
		);

		// The submenu items below all route to the same single-page-app page
		// via a URL hash fragment (e.g. "#/dashboard"), so add_submenu_page()
		// (which expects a distinct top-level page slug per item) can't be
		// used here; writing directly to $submenu is the supported way
		// WordPress core itself adds hash/anchor-style submenu links.
		global $submenu;
		// phpcs:disable WordPress.WP.GlobalVariablesOverride.Prohibited
		$submenu[ self::SLUG ][] = array(
			__( 'Dashboard', 'notifypress' ),
			self::CAP,
			'admin.php?page=' . self::SLUG . '#/dashboard',
		);
		$submenu[ self::SLUG ][] = array(
			__( 'Subscribers', 'notifypress' ),
			self::CAP,
			'admin.php?page=' . self::SLUG . '#/subscribers',
		);
		$submenu[ self::SLUG ][] = array(
			__( 'Segments', 'notifypress' ),
			self::CAP,
			'admin.php?page=' . self::SLUG . '#/segments',
		);
		$submenu[ self::SLUG ][] = array(
			__( 'Campaigns', 'notifypress' ),
			self::CAP,
			'admin.php?page=' . self::SLUG . '#/notifications',
		);
		$submenu[ self::SLUG ][] = array(
			__( 'Automations', 'notifypress' ),
			self::CAP,
			'admin.php?page=' . self::SLUG . '#/automations',
		);
		$submenu[ self::SLUG ][] = array(
			__( 'Analytics', 'notifypress' ),
			self::CAP,
			'admin.php?page=' . self::SLUG . '#/analytics',
		);
		$submenu[ self::SLUG ][] = array(
			__( 'Reports', 'notifypress' ),
			self::CAP,
			'admin.php?page=' . self::SLUG . '#/reports',
		);
		$submenu[ self::SLUG ][] = array(
			__( 'Settings', 'notifypress' ),
			self::CAP,
			'admin.php?page=' . self::SLUG . '#/settings',
		);
		// phpcs:enable WordPress.WP.GlobalVariablesOverride.Prohibited

		do_action( 'notifypress_register_admin_menu', $this );
	}

	/**
	 * Buffer and discard third-party admin notices on the NotifyPress page.
	 *
	 * @return void
	 */
	public function suppress_third_party_notices(): void {
		add_filter( 'admin_footer_text', array( $this, 'admin_footer_text' ) );

		add_action( 'admin_notices', array( $this, 'start_notice_buffer' ), PHP_INT_MIN );
		add_action( 'admin_notices', array( $this, 'end_notice_buffer' ), PHP_INT_MAX );

		add_action( 'all_admin_notices', array( $this, 'start_notice_buffer' ), PHP_INT_MIN );
		add_action( 'all_admin_notices', array( $this, 'end_notice_buffer' ), PHP_INT_MAX );
	}

	/**
	 * Build the NotifyPress admin footer credit text.
	 *
	 * @return string
	 */
	public function admin_footer_text(): string {
		return sprintf(
			'%s <a href="%s" target="_blank" rel="noopener noreferrer">%s</a>',
			esc_html__( 'Thanks for using', 'notifypress' ),
			esc_url( 'https://notifypress.com' ),
			esc_html__( 'NotifyPress', 'notifypress' )
		);
	}

	/**
	 * Start an output buffer to swallow a third-party notice.
	 *
	 * @return void
	 */
	public function start_notice_buffer(): void {
		ob_start();
	}

	/**
	 * End and discard the output buffer started by start_notice_buffer().
	 *
	 * @return void
	 */
	public function end_notice_buffer(): void {
		if ( ob_get_level() > 0 ) {
			ob_end_clean();
		}
	}

	/**
	 * Redirect to the setup wizard once, on the first admin page load after
	 * activation.
	 *
	 * The flag is cleared before redirecting, so the wizard never blocks the
	 * rest of wp-admin: an admin who leaves it can browse Plugins, Posts and
	 * so on, and finish setup later from the NotifyPress menu.
	 *
	 * @return void
	 */
	public function maybe_redirect_to_setup(): void {
		if ( ! current_user_can( self::CAP ) || ! get_option( Installer::SETUP_REDIRECT_OPTION ) ) {
			return;
		}

		if ( wp_doing_ajax() || is_network_admin() ) {
			return;
		}

		delete_option( Installer::SETUP_REDIRECT_OPTION );

		if ( Settings::get( 'setupCompleted', false ) ) {
			return;
		}

		// Already on the NotifyPress screen, which shows the wizard itself.
		if ( self::SLUG === filter_input( INPUT_GET, 'page', FILTER_SANITIZE_FULL_SPECIAL_CHARS ) ) {
			return;
		}

		// Activated together with other plugins: stay on the Plugins screen.
		if ( isset( $_GET['activate-multi'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- presence check only; set by WordPress core on bulk activation.
			return;
		}

		wp_safe_redirect( admin_url( 'admin.php?page=' . self::SLUG . '#/setup' ) );
		exit;
	}

	/**
	 * Render the NotifyPress admin page shell (a React SPA mount point).
	 *
	 * @return void
	 */
	public function render_page(): void {
		$this->assets::enqueue_script( Assets::SCRIPT_HANDLE . '-main' );
		$this->assets::enqueue_style( Assets::STYLE_HANDLE . '-main' );

		echo '<div class="notifypress-admin-page">';

		/**
		 * Use this hook for NotifyPress-only admin notices.
		 */
		do_action( 'notifypress_admin_notices' );

		echo '<div id="' . esc_attr( self::SLUG ) . '"></div>';
		echo '</div>';
	}

	/**
	 * Register the service.
	 *
	 * @return void
	 */
	public static function register(): void {
		new self( new Assets() );
	}
}

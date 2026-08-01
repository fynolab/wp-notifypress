<?php
/**
 * Installer class
 *
 * @package Fynolab\NotifyPress
 */

declare(strict_types=1);

namespace Fynolab\NotifyPress;

defined( 'ABSPATH' ) || exit;

/**
 * Installer class
 */
class Installer {

	public const SETUP_REDIRECT_OPTION = 'notifypress_setup_redirect';

	/**
	 * Run the installer.
	 *
	 * @return void
	 */
	public static function run(): void {
		update_option( self::SETUP_REDIRECT_OPTION, '1' );
	}
}

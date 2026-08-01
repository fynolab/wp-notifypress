<?php
/**
 * Public post type lookups.
 *
 * @package Fynolab\NotifyPress\Services\Settings
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\Settings;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the site's currently-registered public post types, for both
 * validating the "new post" notification settings and listing choices for
 * the settings UI's post type picker.
 */
class PostTypeOptions {
	/**
	 * Slugs of every currently public post type.
	 *
	 * @return string[]
	 */
	public static function public_names(): array {
		return get_post_types( array( 'public' => true ), 'names' );
	}

	/**
	 * Public post types as {name, label} choices, for the settings UI.
	 * Attachments are excluded — "new attachment published" isn't a
	 * meaningful notification event.
	 *
	 * @return array<int, array{name: string, label: string}>
	 */
	public static function choices(): array {
		$post_types = get_post_types( array( 'public' => true ), 'objects' );
		unset( $post_types['attachment'] );

		$choices = array();

		foreach ( $post_types as $post_type ) {
			$choices[] = array(
				'name'  => $post_type->name,
				'label' => $post_type->label,
			);
		}

		return $choices;
	}
}

<?php
/**
 * Per-post notification settings.
 *
 * @package Fynolab\NotifyPress\Services\NewPost
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\NewPost;

use Fynolab\NotifyPress\Services\Settings\Settings;
use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * The notification a single post will send when it is published: whether to
 * send at all, and the title/message to use.
 *
 * Stored as post meta so it travels with the post (revisions, exports, REST)
 * and is editable from the block editor's document sidebar panel. Each value
 * falls back to a sensible default derived from the post itself, so a post the
 * author never touched still behaves exactly as it did before this panel
 * existed.
 */
class PostNotification {
	public const META_SEND    = '_notifypress_send';
	public const META_TITLE   = '_notifypress_title';
	public const META_MESSAGE = '_notifypress_message';

	// Mirrors the app's SendNotificationRequest rules — the API rejects
	// anything longer, so trim here rather than fail the send.
	public const TITLE_MAX   = 50;
	public const MESSAGE_MAX = 100;

	/**
	 * Register the meta keys on every public post type, so the block editor
	 * can read and write them over the REST API.
	 *
	 * @return void
	 */
	public static function register_meta(): void {
		$fields = array(
			self::META_SEND    => 'boolean',
			self::META_TITLE   => 'string',
			self::META_MESSAGE => 'string',
		);

		foreach ( self::post_types() as $post_type ) {
			// The REST posts controller only exposes `meta` for post types
			// that support custom fields, and without it the block editor has
			// no way to save the panel's values. Core's post/page already do;
			// custom post types often don't.
			if ( ! post_type_supports( $post_type, 'custom-fields' ) ) {
				add_post_type_support( $post_type, 'custom-fields' );
			}

			foreach ( $fields as $meta_key => $type ) {
				register_post_meta(
					$post_type,
					$meta_key,
					array(
						'type'              => $type,
						'single'            => true,
						'show_in_rest'      => true,
						'default'           => 'boolean' === $type ? true : '',
						'sanitize_callback' => 'boolean' === $type
							? 'rest_sanitize_boolean'
							: 'sanitize_text_field',
						'auth_callback'     => static function ( $allowed, $meta_key, $post_id ) {
							return current_user_can( 'edit_post', (int) $post_id );
						},
					)
				);
			}
		}
	}

	/**
	 * Whether publishing this post should notify subscribers.
	 *
	 * The global settings still win: a post opted in individually is not sent
	 * if post notifications are off site-wide, or its post type is excluded.
	 *
	 * @param WP_Post $post The post.
	 *
	 * @return bool
	 */
	public static function should_send( WP_Post $post ): bool {
		$post_type = get_post_type_object( $post->post_type );

		if ( ! $post_type || ! $post_type->public ) {
			return false;
		}

		if ( ! Settings::get( 'postNotificationEnabled', true ) ) {
			return false;
		}

		if ( ! self::post_type_is_selected( $post->post_type ) ) {
			return false;
		}

		// A post with no stored choice — published outside the editor, or
		// before this panel existed — keeps the old behaviour and sends.
		// metadata_exists(), not get_post_meta(): an opted-out post stores
		// false, which reads back as '' and is indistinguishable from absent.
		if ( ! metadata_exists( 'post', $post->ID, self::META_SEND ) ) {
			return true;
		}

		return (bool) get_post_meta( $post->ID, self::META_SEND, true );
	}

	/**
	 * The notification title for a post — the author's override, else the
	 * post title.
	 *
	 * @param WP_Post $post The post.
	 *
	 * @return string
	 */
	public static function title_for( WP_Post $post ): string {
		$title = (string) get_post_meta( $post->ID, self::META_TITLE, true );

		return self::trim_to( '' !== trim( $title ) ? $title : self::default_title( $post ), self::TITLE_MAX );
	}

	/**
	 * The notification message for a post — the author's override, else an
	 * excerpt of the post.
	 *
	 * @param WP_Post $post The post.
	 *
	 * @return string
	 */
	public static function message_for( WP_Post $post ): string {
		$message = (string) get_post_meta( $post->ID, self::META_MESSAGE, true );

		return self::trim_to( '' !== trim( $message ) ? $message : self::default_message( $post ), self::MESSAGE_MAX );
	}

	/**
	 * The title a post falls back to when the author hasn't written one.
	 *
	 * @param WP_Post $post The post.
	 *
	 * @return string
	 */
	public static function default_title( WP_Post $post ): string {
		$title = wp_strip_all_tags( get_the_title( $post ) );

		return self::trim_to( '' !== trim( $title ) ? $title : get_bloginfo( 'name' ), self::TITLE_MAX );
	}

	/**
	 * The message a post falls back to when the author hasn't written one:
	 * its excerpt, or the opening of its content.
	 *
	 * @param WP_Post $post The post.
	 *
	 * @return string
	 */
	public static function default_message( WP_Post $post ): string {
		$excerpt = has_excerpt( $post )
			? get_the_excerpt( $post )
			: wp_strip_all_tags( strip_shortcodes( $post->post_content ) );

		$excerpt = trim( preg_replace( '/\s+/', ' ', (string) $excerpt ) ?? '' );

		if ( '' === $excerpt ) {
			$excerpt = self::default_title( $post );
		}

		return self::trim_to( $excerpt, self::MESSAGE_MAX );
	}

	/**
	 * The URL a notification for this post should open. Unpublished posts have
	 * no public permalink yet, so they fall back to the site home.
	 *
	 * @param WP_Post $post The post.
	 *
	 * @return string
	 */
	public static function target_url( WP_Post $post ): string {
		if ( 'publish' !== $post->post_status ) {
			return home_url( '/' );
		}

		$permalink = get_permalink( $post );

		return $permalink ? $permalink : home_url( '/' );
	}

	/**
	 * Shorten a string to a maximum length without cutting a word in half.
	 *
	 * @param string $text   The text to shorten.
	 * @param int    $length The maximum length.
	 *
	 * @return string
	 */
	public static function trim_to( string $text, int $length ): string {
		$text = trim( $text );

		if ( mb_strlen( $text ) <= $length ) {
			return $text;
		}

		// wp_trim_words() can't hit an exact character budget, so trim by
		// characters and drop the trailing partial word.
		$trimmed = mb_substr( $text, 0, $length );
		$space   = mb_strrpos( $trimmed, ' ' );

		if ( false !== $space && $space > (int) floor( $length / 2 ) ) {
			$trimmed = mb_substr( $trimmed, 0, $space );
		}

		return rtrim( $trimmed, " \t\n\r\0\x0B,.;:-" );
	}

	/**
	 * The post types the panel and meta apply to.
	 *
	 * @return string[]
	 */
	public static function post_types(): array {
		return array_values( get_post_types( array( 'public' => true ), 'names' ) );
	}

	/**
	 * Whether the given post type should trigger a notification, per the
	 * "all public post types" / "specific post types" setting.
	 *
	 * @param string $post_type The post type slug.
	 *
	 * @return bool
	 */
	public static function post_type_is_selected( string $post_type ): bool {
		if ( Settings::get( 'postNotificationAllTypes', true ) ) {
			return true;
		}

		return in_array( $post_type, Settings::get( 'postNotificationPostTypes', array() ), true );
	}
}

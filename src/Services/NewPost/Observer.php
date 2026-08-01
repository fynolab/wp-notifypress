<?php
/**
 * New Post observer.
 *
 * @package Fynolab\NotifyPress\Services\NewPost
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\NewPost;

use Fynolab\NotifyPress\Assets;
use Fynolab\NotifyPress\Interfaces\Observer as ObserverInterface;
use Fynolab\NotifyPress\Notifier;
use Fynolab\NotifyPress\Services\Settings\Settings;
use WP_Post;

/**
 * Notifies subscribers when a post is published, and handles the
 * "send now" admin AJAX trigger.
 */
class Observer implements ObserverInterface {
	/**
	 * Observe the new post.
	 *
	 * @return void
	 */
	public function observe(): void {
		add_action( 'transition_post_status', array( $this, 'on_new_post' ), 10, 3 );

		// Trigger notification for individual post via AJAX.
		add_action( 'wp_ajax_notifypress_trigger_notification', array( $this, 'trigger_notification' ) );
	}

	/**
	 * Notify the Push Service on new post.
	 *
	 * @param   string  $new_status The new post status.
	 * @param   string  $old_status The previous post status.
	 * @param   WP_Post $post       The post object.
	 *
	 * @return void
	 */
	public function on_new_post( string $new_status, string $old_status, WP_Post $post ): void {
		if ( 'publish' !== $new_status || $old_status === $new_status ) {
			return;
		}

		$post_type = get_post_type_object( $post->post_type );

		if ( ! $post_type || ! $post_type->public ) {
			return;
		}

		if ( ! Settings::get( 'postNotificationEnabled', true ) ) {
			return;
		}

		if ( ! $this->post_type_is_selected( $post->post_type ) ) {
			return;
		}

		$payload = array(
			'title'      => 'A new post has been published',
			'message'    => $post->post_title,
			'target_url' => get_permalink( $post ),
		);

		Notifier::notify_subscribers( $payload );
	}

	/**
	 * Whether the given post type should trigger a notification, per the
	 * "all public post types" / "specific post types" setting.
	 *
	 * @param string $post_type The post type slug.
	 *
	 * @return bool
	 */
	private function post_type_is_selected( string $post_type ): bool {
		if ( Settings::get( 'postNotificationAllTypes', true ) ) {
			return true;
		}

		return in_array( $post_type, Settings::get( 'postNotificationPostTypes', array() ), true );
	}

	/**
	 * Trigger notification via AJAX.
	 *
	 * @return void
	 */
	public function trigger_notification(): void {
		// Verify nonce.
		$nonce = sanitize_text_field( wp_unslash( $_POST['nonce'] ?? '' ) );

		if ( ! wp_verify_nonce( $nonce, Assets::NONCE_ACTION ) ) {
			wp_send_json_error( 'Invalid nonce.' );
		}

		// Check user capability.
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( 'Insufficient permissions.' );
		}

		// Sanitize and validate post ID.
		$post_id = absint( $_POST['post_id'] ?? 0 );

		if ( ! $post_id ) {
			wp_send_json_error( 'Post ID is required.' );
		}

		$post = get_post( $post_id );

		if ( ! $post instanceof WP_Post ) {
			wp_send_json_error( 'Post not found' );
		}

		// Verify user can edit this post.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			wp_send_json_error( 'You do not have permission to send notifications for this post.' );
		}

		$payload = array(
			'title'      => 'A new post has been published',
			'message'    => $post->post_title,
			'target_url' => 'publish' === $post->post_status ? get_permalink( $post ) : '',
		);

		Notifier::notify_subscribers( $payload );

		wp_send_json_success( 'Notification sent successfully!' );
	}
}

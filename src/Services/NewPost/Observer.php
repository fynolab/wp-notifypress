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
use WP_Post;

/**
 * Notifies subscribers when a post is published, and handles the editor
 * panel's "Test Notification" AJAX action.
 */
class Observer implements ObserverInterface {
	/**
	 * Observe the new post.
	 *
	 * @return void
	 */
	public function observe(): void {
		// Priority 20: custom post types register on `init` at the default
		// priority, and meta must be registered for all of them.
		add_action( 'init', array( PostNotification::class, 'register_meta' ), 20 );
		add_action( 'transition_post_status', array( $this, 'on_new_post' ), 10, 3 );

		// Send a test notification to the editing browser's own subscription.
		add_action( 'wp_ajax_notifypress_send_test_notification', array( $this, 'send_test_notification' ) );
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

		if ( ! PostNotification::should_send( $post ) ) {
			return;
		}

		$payload = array(
			'title'      => PostNotification::title_for( $post ),
			'message'    => PostNotification::message_for( $post ),
			'target_url' => PostNotification::target_url( $post ),
		);

		Notifier::notify_subscribers( $payload );
	}

	/**
	 * Send a test notification to a single subscriber — the browser the post
	 * is being edited in — using the panel's current, possibly unsaved values.
	 *
	 * @return void
	 */
	public function send_test_notification(): void {
		// Verify nonce.
		$nonce = sanitize_text_field( wp_unslash( $_POST['nonce'] ?? '' ) );

		if ( ! wp_verify_nonce( $nonce, Assets::NONCE_ACTION ) ) {
			wp_send_json_error( __( 'Invalid nonce.', 'notifypress' ) );
		}

		// Check user capability.
		if ( ! current_user_can( 'edit_posts' ) ) {
			wp_send_json_error( __( 'Insufficient permissions.', 'notifypress' ) );
		}

		// Sanitize and validate post ID.
		$post_id = absint( $_POST['post_id'] ?? 0 );

		if ( ! $post_id ) {
			wp_send_json_error( __( 'Post ID is required.', 'notifypress' ) );
		}

		$post = get_post( $post_id );

		if ( ! $post instanceof WP_Post ) {
			wp_send_json_error( __( 'Post not found.', 'notifypress' ) );
		}

		// Verify user can edit this post.
		if ( ! current_user_can( 'edit_post', $post_id ) ) {
			wp_send_json_error( __( 'You do not have permission to send notifications for this post.', 'notifypress' ) );
		}

		// The widget stores this in the visitor's browser when they subscribe.
		// Without it there is nobody to send the test to — and falling back to
		// "everyone" would turn a test into a live campaign.
		$subscriber_token = sanitize_text_field( wp_unslash( $_POST['subscriber_token'] ?? '' ) );

		if ( empty( $subscriber_token ) ) {
			wp_send_json_error(
				__( 'Subscribe to push notifications in this browser first — a test is sent only to you.', 'notifypress' )
			);
		}

		$title   = sanitize_text_field( wp_unslash( $_POST['title'] ?? '' ) );
		$message = sanitize_text_field( wp_unslash( $_POST['message'] ?? '' ) );

		$payload = array(
			'title'      => PostNotification::trim_to(
				'' !== trim( $title ) ? $title : PostNotification::title_for( $post ),
				PostNotification::TITLE_MAX
			),
			'message'    => PostNotification::trim_to(
				'' !== trim( $message ) ? $message : PostNotification::message_for( $post ),
				PostNotification::MESSAGE_MAX
			),
			'target_url' => PostNotification::target_url( $post ),
		);

		Notifier::notify_subscriber( $subscriber_token, $payload );

		if ( ! Notifier::last_send_succeeded() ) {
			wp_send_json_error(
				__( 'The app rejected the test notification. Check the connection in NotifyPress → Settings, and that this browser is still subscribed.', 'notifypress' )
			);
		}

		wp_send_json_success( __( 'Test notification sent to this browser.', 'notifypress' ) );
	}
}

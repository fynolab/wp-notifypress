<?php
/**
 * New Post service.
 *
 * @package Fynolab\NotifyPress\Services\NewPost
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\NewPost;

use Fynolab\NotifyPress\Interfaces\Service;

defined( 'ABSPATH' ) || exit;

/**
 * Sends a notification when a post is published.
 */
class NewPost implements Service {

	/**
	 * The post-publish observer.
	 *
	 * @var Observer
	 */
	private Observer $observer;

	/**
	 * Set up the observer.
	 */
	private function __construct() {
		$this->observer = new Observer();
		$this->observer->observe();
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

<?php
/**
 * Server-side proxy to the NotifyPress app API.
 *
 * @package Fynolab\NotifyPress\Services\NotifyPress\Rest
 */

declare( strict_types=1 );

namespace Fynolab\NotifyPress\Services\NotifyPress\Rest;

use Fynolab\NotifyPress\Interfaces\RestController;
use Fynolab\NotifyPress\Services\NotifyPress\Client;
use Fynolab\NotifyPress\Services\Settings\SettingsRepository;
use NotifyPress\Exception\ApiException;
use NotifyPress\Exception\NotifyPressException;
use NotifyPress\Http\Multipart\MultipartBody;
use NotifyPress\Http\RequestOptions;
use NotifyPress\Http\Response;
use NotifyPress\NotifyPress as Sdk;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Forwards admin-screen API calls to the app as `notifypress/v1/proxy`.
 *
 * The admin UI used to call the app straight from the browser, which meant the
 * site's API token — a full-access credential — had to be handed to the page to
 * put in an Authorization header. Any script running in wp-admin could read it
 * and reuse it anywhere, indefinitely.
 *
 * Routing through here keeps the token on the server. The browser authenticates
 * as a WordPress administrator instead, using a capability check and the REST
 * nonce, and the app's response is handed back byte for byte so the UI cannot
 * tell the difference.
 *
 * This is deliberately one generic route rather than a controller per endpoint:
 * the admin app touches nearly the whole API, and mirroring ~25 endpoints in
 * PHP would be a large surface to write, test, and keep in step with the app.
 * The path allowlist below is what keeps it from being an open relay.
 */
class ProxyController implements RestController {
	/**
	 * The query parameter naming the app endpoint to call.
	 *
	 * Prefixed so it cannot collide with a parameter the app itself defines.
	 */
	private const PATH_PARAM = 'np_path';

	/**
	 * Header carrying a one-shot token for the connect flow.
	 */
	private const TOKEN_HEADER = 'x-notifypress-token';

	/**
	 * Query parameters WordPress adds that must not be forwarded.
	 */
	private const RESERVED_PARAMS = array( self::PATH_PARAM, '_locale', 'rest_route', '_wpnonce' );

	/**
	 * First path segments the admin UI is allowed to reach.
	 *
	 * Everything the admin app uses, and nothing else — notably not
	 * `public/*`, which is unauthenticated, Origin-validated, and has no
	 * business being reached through an authenticated proxy.
	 */
	private const ALLOWED_SEGMENTS = array(
		'analytics',
		'announcements',
		'automations',
		'dashboard',
		'notifications',
		'reports',
		'segments',
		'sites',
		'subscribers',
		'tags',
	);

	/**
	 * Register the controller's REST routes.
	 *
	 * @return void
	 */
	public function register_routes(): void {
		register_rest_route(
			'notifypress/v1',
			'/proxy',
			array(
				array(
					'methods'             => 'GET, POST, PUT, PATCH, DELETE',
					'callback'            => array( $this, 'proxy' ),
					'permission_callback' => array( $this, 'permission_check' ),
					'args'                => array(
						self::PATH_PARAM => array(
							'required'          => true,
							'type'              => 'string',
							'validate_callback' => array( $this, 'is_allowed_path' ),
						),
					),
				),
			)
		);
	}

	/**
	 * Only administrators may drive the app API.
	 *
	 * This is the same bar that previously guarded handing out the token, so no
	 * one gains access they did not already have — they simply no longer get
	 * the credential itself.
	 *
	 * @return bool
	 */
	public function permission_check(): bool {
		return current_user_can( 'manage_options' );
	}

	/**
	 * Whether a requested path is one the admin UI is allowed to reach.
	 *
	 * @param mixed $path The requested app path.
	 *
	 * @return bool
	 */
	public function is_allowed_path( $path ): bool {
		if ( ! is_string( $path ) || '' === $path ) {
			return false;
		}

		// Reject anything that is not a plain relative path: an absolute URL
		// would turn this into an open relay, and traversal could climb out of
		// the versioned API prefix.
		if ( str_contains( $path, '..' ) || str_contains( $path, '://' ) || str_starts_with( $path, '//' ) ) {
			return false;
		}

		$segments = explode( '/', trim( (string) wp_parse_url( $path, PHP_URL_PATH ), '/' ) );

		return in_array( $segments[0] ?? '', self::ALLOWED_SEGMENTS, true );
	}

	/**
	 * Forward the request to the app and return its response verbatim.
	 *
	 * @param WP_REST_Request $request The incoming proxy request.
	 *
	 * @return void
	 */
	public function proxy( WP_REST_Request $request ): void {
		$client = $this->client_for( $request );

		if ( null === $client ) {
			$this->fail( 503, __( 'API token not configured.', 'notifypress' ) );
		}

		$options = RequestOptions::make();

		// A test send targets one subscriber via this header; the app ignores a
		// body field of the same name, so it has to survive the hop.
		$subscription_token = $request->get_header( 'notifypress-subscription-token' );

		if ( ! empty( $subscription_token ) ) {
			$options = $options->withHeader(
				'notifypress-subscription-token',
				sanitize_text_field( $subscription_token )
			);
		}

		// The browser's IANA timezone, so the app can save it for emails and PDF
		// reports. Anything that is not a plausible zone name is dropped.
		$timezone = $request->get_header( 'X-Timezone' );

		if ( ! empty( $timezone ) && 1 === preg_match( '/^[A-Za-z0-9_+\-\/]{1,64}\z/', $timezone ) ) {
			$options = $options->withHeader( 'X-Timezone', $timezone );
		}

		try {
			$response = $client->transport()->requestRaw(
				$request->get_method(),
				(string) $request->get_param( self::PATH_PARAM ),
				$this->query( $request ),
				$this->body( $request ),
				$options
			);
		} catch ( ApiException $exception ) {
			// The SDK keeps the raw response on the exception, so a 4xx from the
			// app reaches the browser with its own status and body — the UI
			// already knows how to render those.
			if ( null === $exception->response ) {
				$this->fail( 502, $exception->getMessage() );
			}

			$response = $exception->response;
		} catch ( NotifyPressException $exception ) {
			$this->fail( 504, $exception->getMessage() );
		}

		$this->emit( $response );
	}

	/**
	 * The client this request should authenticate with.
	 *
	 * Normally the saved token, which the browser never sees. During the
	 * connect flow there is nothing saved yet — the admin has just pasted a
	 * token and the screen has to prove it works before storing it — so a
	 * one-shot token may be supplied by header instead. That is no privilege
	 * escalation: the same capability check already lets this user write the
	 * token to the settings outright.
	 *
	 * @param WP_REST_Request $request The incoming proxy request.
	 *
	 * @return Sdk|null
	 */
	private function client_for( WP_REST_Request $request ): ?Sdk {
		$override = (string) $request->get_header( self::TOKEN_HEADER );

		if ( '' !== $override && ! SettingsRepository::is_masked( $override ) ) {
			return Client::for_token( sanitize_text_field( $override ) );
		}

		return Client::make();
	}

	/**
	 * The query parameters to forward, minus WordPress's own.
	 *
	 * @param WP_REST_Request $request The incoming proxy request.
	 *
	 * @return array
	 */
	private function query( WP_REST_Request $request ): array {
		$query = array();

		foreach ( $request->get_query_params() as $key => $value ) {
			if ( in_array( $key, self::RESERVED_PARAMS, true ) || ! is_scalar( $value ) ) {
				continue;
			}

			$query[ (string) $key ] = $value;
		}

		return $query;
	}

	/**
	 * The request body to forward.
	 *
	 * File uploads arrive as multipart, which PHP has already parsed into
	 * $_POST/$_FILES by the time this runs — so the body is rebuilt rather than
	 * passed through. The SDK's builder does that, and applies the same size
	 * and type limits the app would, so an oversized icon fails here with the
	 * message the app would have sent.
	 *
	 * @param WP_REST_Request $request The incoming proxy request.
	 *
	 * @return array|MultipartBody|null
	 */
	private function body( WP_REST_Request $request ) {
		$files = $request->get_file_params();

		if ( ! empty( $files ) ) {
			$multipart = MultipartBody::fromArray( wp_unslash( $request->get_body_params() ) );

			foreach ( $files as $field => $file ) {
				if ( ! isset( $file['tmp_name'] ) || UPLOAD_ERR_OK !== ( $file['error'] ?? UPLOAD_ERR_NO_FILE ) ) {
					continue;
				}

				$multipart = $multipart->file(
					(string) $field,
					$file['tmp_name'],
					sanitize_file_name( (string) ( $file['name'] ?? 'upload' ) )
				);
			}

			return $multipart;
		}

		$json = $request->get_json_params();

		if ( is_array( $json ) && array() !== $json ) {
			return $json;
		}

		$params = $request->get_body_params();

		return empty( $params ) ? null : wp_unslash( $params );
	}

	/**
	 * Send the app's response straight back to the browser.
	 *
	 * Emitted rather than returned so the bytes survive intact: report
	 * downloads are binary PDFs, and running any response through WordPress's
	 * JSON serialisation would corrupt them.
	 *
	 * @param Response $response The app's response.
	 *
	 * @return void
	 */
	private function emit( Response $response ): void {
		status_header( $response->status );
		header( 'Content-Type: ' . ( $response->header( 'content-type' ) ?? 'application/json' ) );

		$disposition = $response->header( 'content-disposition' );

		if ( null !== $disposition ) {
			header( 'Content-Disposition: ' . $disposition );
		}

		// A verbatim proxy: escaping here would corrupt the JSON and PDF bodies
		// this exists to pass through, and the payload is the app's own
		// response, never user input echoed back.
		// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		echo $response->body;

		exit;
	}

	/**
	 * Emit a proxy-level failure in the shape the UI expects.
	 *
	 * @param int    $status  The HTTP status to send.
	 * @param string $message The failure reason.
	 *
	 * @return void
	 */
	private function fail( int $status, string $message ): void {
		status_header( $status );
		header( 'Content-Type: application/json' );

		echo wp_json_encode( array( 'message' => $message ) );

		exit;
	}
}

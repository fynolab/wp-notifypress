import { browserTimeZone } from './format';
import { isMaskedToken } from './settings';
import type {
    Announcement,
    ConnectedSite,
    NotifyPressSettings,
} from '../types';

type QueryValue = string | number | boolean | null | undefined;
interface LaravelRequestOptions {
    method?: string;
    query?: Record< string, QueryValue >;
    headers?: Record< string, string >;
    body?: unknown;
    subscriptionToken?: string;
}

export class LaravelRequestError extends Error {
    status: number;

    constructor( message: string, status: number ) {
        super( message );
        this.name = 'LaravelRequestError';
        this.status = status;
    }
}

/**
 * True when the app rejected the API token (401). Pages treat this like
 * "no data yet" and render their empty state instead of an error view.
 * @param error
 */
export const isUnauthorizedError = ( error: unknown ) =>
    error instanceof LaravelRequestError && 401 === error.status;

const toQueryString = ( params?: Record< string, QueryValue > ) => {
    const search = new URLSearchParams();

    Object.entries( params || {} ).forEach( ( [ key, value ] ) => {
        if ( value === undefined || value === null || value === '' ) {
            return;
        }

        search.set( key, String( value ) );
    } );

    const query = search.toString();
    return query ? `?${ query }` : '';
};

const getSubscriptionToken = () => {
    if ( typeof window === 'undefined' ) {
        return '';
    }

    try {
        return (
            window.localStorage.getItem( 'notifypress-SubscriptionToken' ) || ''
        );
    } catch ( error ) {
        return '';
    }
};

export const validateConnection = ( settings: NotifyPressSettings ) =>
    laravelRequest< { data?: ConnectedSite } >( settings, '/sites/current' );

export const getAnnouncements = ( settings?: NotifyPressSettings ) =>
    laravelRequest< { announcements: Announcement[]; unread_count: number } >(
        settings,
        '/announcements'
    );

export const markAllAnnouncementsRead = ( settings?: NotifyPressSettings ) =>
    laravelRequest< { ok: boolean } >( settings, '/announcements/read-all', {
        method: 'POST',
    } );

/**
 * Requests go to the plugin's own REST proxy, never straight to the app.
 *
 * The app's API token is a full-access credential, so it stays on the server:
 * this authenticates as a WordPress administrator with the REST nonce instead,
 * and the proxy attaches the token out of reach of anything running in the
 * page. The proxy replays the app's status, headers and body verbatim, so
 * everything downstream of here behaves exactly as it did when these calls went
 * out directly.
 *
 * `settings` is still read, but only for the connect flow: while the admin is
 * pasting a token that has not been saved yet, there is nothing on the server
 * to authenticate with, so that one token is forwarded for that request. Every
 * other time the settings carry only a mask, and nothing is sent.
 * @param settings
 * @param path
 * @param options
 */
function buildLaravelFetch(
    settings: NotifyPressSettings | undefined,
    path: string,
    options: LaravelRequestOptions = {}
) {
    const bootstrap = window.notifypress;
    const restUrl = bootstrap?.restUrl;

    if ( ! restUrl ) {
        throw new Error( 'NotifyPress REST endpoint unavailable.' );
    }

    const query = toQueryString( {
        ...( options.query || {} ),
        np_path: path,
    } );
    const url = `${ restUrl.replace( /\/$/, '' ) }/proxy${ query }`;
    const headers: Record< string, string > = {
        Accept: 'application/json',
        'X-WP-Nonce': bootstrap?.restNonce || '',
        'X-Timezone': browserTimeZone(),
        ...( options.headers || {} ),
    };
    const subscriptionToken =
        options.subscriptionToken || getSubscriptionToken();

    if ( subscriptionToken && ! headers[ 'notifypress-subscription-token' ] ) {
        headers[ 'notifypress-subscription-token' ] = subscriptionToken;
    }

    // Only ever set while connecting: anything the server hands back is masked,
    // so a real token here means the admin just typed one that is not stored.
    const unsavedToken = settings?.apiToken || settings?.apiKey || '';

    if ( unsavedToken && ! isMaskedToken( unsavedToken ) ) {
        headers[ 'X-NotifyPress-Token' ] = unsavedToken;
    }

    const config: RequestInit = {
        method: options.method || 'GET',
        headers,
        // The nonce only authenticates alongside the logged-in cookie.
        credentials: 'same-origin',
    };

    if ( options.body instanceof FormData ) {
        config.body = options.body;
    } else if ( options.body !== undefined ) {
        headers[ 'Content-Type' ] = 'application/json';
        config.body = JSON.stringify( options.body );
    }

    return { url, config };
}

export async function laravelFetch(
    settings: NotifyPressSettings | undefined,
    path: string,
    options: LaravelRequestOptions = {}
): Promise< Response > {
    const { url, config } = buildLaravelFetch( settings, path, options );

    return fetch( url, config );
}

export async function laravelRequest< T = unknown >(
    settings: NotifyPressSettings | undefined,
    path: string,
    options: LaravelRequestOptions = {}
): Promise< T > {
    const response = await laravelFetch( settings, path, options );
    const isJson = response.headers
        .get( 'content-type' )
        ?.includes( 'application/json' );
    const payload = isJson ? await response.json() : null;

    if ( ! response.ok ) {
        throw new LaravelRequestError(
            payload?.message || payload?.error || 'Request failed.',
            response.status
        );
    }

    return payload as T;
}

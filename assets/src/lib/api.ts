import { getApiToken, getPluginBootstrap } from './settings';
import type { Announcement, ConnectedSite, NotifyPressSettings } from '../types';

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

const getBaseUrl = ( settings?: NotifyPressSettings ) => {
    const bootstrap = getPluginBootstrap() as NotifyPressSettings & {
        defaultAppUrl?: string;
    };
    const appUrl =
        settings?.appUrl ||
        bootstrap.defaultAppUrl ||
        bootstrap.appUrl ||
        'https://app.notifypress.com';
    return `${ String( appUrl ).replace( /\/$/, '' ) }/api/v1`;
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

function buildLaravelFetch(
    settings: NotifyPressSettings | undefined,
    path: string,
    options: LaravelRequestOptions = {}
) {
    const token = getApiToken( settings );

    if ( ! token ) {
        throw new Error( 'API token not configured.' );
    }

    const query = toQueryString( options.query );
    const url = `${ getBaseUrl( settings ) }${ path }${ query }`;
    const headers: Record< string, string > = {
        Authorization: `Bearer ${ token }`,
        Accept: 'application/json',
        ...( options.headers || {} ),
    };
    const subscriptionToken =
        options.subscriptionToken || getSubscriptionToken();

    if (
        subscriptionToken &&
        ! headers[ 'notifypress-subscription-token' ]
    ) {
        headers[ 'notifypress-subscription-token' ] = subscriptionToken;
    }

    const config: RequestInit = {
        method: options.method || 'GET',
        headers,
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

import { API_URL } from './app';
import { getApiToken } from './settings';
import type { Announcement, ConnectedSite, NotifyPressSettings } from '../types';

type QueryValue = string | number | boolean | null | undefined;

interface LaravelRequestOptions {
    method?: string;
    query?: Record< string, QueryValue >;
    headers?: Record< string, string >;
    body?: unknown;
    subscriptionToken?: string;
}

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
    const url = `${ API_URL }${ path }${ query }`;
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
        throw new Error(
            payload?.message || payload?.error || 'Request failed.'
        );
    }

    return payload as T;
}

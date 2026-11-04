import { laravelRequest } from './api';
import { getApiToken, getBootstrapSettings, hasApiToken } from './settings';
import { queryClient } from './query-client';
import { automationsListQuery } from '../components/automations/automations-query';
import { SUBSCRIBERS_LIST_PARAMS } from '../components/subscribers/subscribers-query';
import type { NotifyPressSettings } from '../types';

// Mirrors the `queryKey`/`queryFn` each page's first-load `useQuery` call
// uses, so a hover-warmed cache entry is actually hit on navigation instead
// of triggering a second request.
function prefetchEntries( settings: NotifyPressSettings ) {
    const token = getApiToken( settings );

    return {
        '/dashboard': () =>
            queryClient.prefetchQuery( {
                queryKey: [ 'np-dashboard', token ],
                queryFn: () => laravelRequest( settings, '/dashboard' ),
            } ),
        '/subscribers': () => {
            queryClient.prefetchQuery( {
                queryKey: [ 'np-subscribers', token, '' ],
                queryFn: () =>
                    laravelRequest( settings, '/subscribers', {
                        query: SUBSCRIBERS_LIST_PARAMS,
                    } ),
            } );
            queryClient.prefetchQuery( {
                queryKey: [ 'np-tags', token ],
                queryFn: () => laravelRequest( settings, '/tags' ),
            } );
        },
        '/segments': () =>
            queryClient.prefetchQuery( {
                queryKey: [ 'np-segments', token ],
                queryFn: () => laravelRequest( settings, '/segments' ),
            } ),
        // Same opt-in flags as the campaign list (full titles and messages, no
        // welcome messages), which are part of its query key.
        '/notifications': () =>
            queryClient.prefetchQuery( {
                queryKey: [
                    'np-notifications',
                    token,
                    '',
                    'all',
                    { full_text: 1, exclude_welcome: 1 },
                ],
                queryFn: () =>
                    laravelRequest( settings, '/notifications', {
                        query: { full_text: 1, exclude_welcome: 1 },
                    } ),
            } ),
        // The new-campaign form's first-load queries (NotificationForm), keyed
        // on settings.apiToken exactly as that form keys them.
        '/notifications/new': () => {
            queryClient.prefetchQuery( {
                queryKey: [ 'np-segments-all', settings.apiToken, 100 ],
                queryFn: () =>
                    laravelRequest( settings, '/segments', {
                        query: { per_page: 100 },
                    } ),
            } );
            queryClient.prefetchQuery( {
                queryKey: [ 'np-subscribers-total', settings.apiToken ],
                queryFn: () =>
                    laravelRequest( settings, '/subscribers', {
                        query: { limit: 1 },
                    } ),
            } );
            queryClient.prefetchQuery( {
                queryKey: [ 'np-notifications-latest', settings.apiToken ],
                queryFn: () =>
                    laravelRequest( settings, '/notifications', {
                        query: { limit: 1, order: 'desc' },
                    } ),
            } );
        },
        '/automations': () =>
            queryClient.prefetchQuery( automationsListQuery( settings ) ),
        '/analytics': () =>
            queryClient.prefetchQuery( {
                queryKey: [ 'np-analytics', token ],
                queryFn: () => laravelRequest( settings, '/analytics' ),
            } ),
        '/reports': () =>
            queryClient.prefetchQuery( {
                queryKey: [ 'np-reports-meta', token ],
                queryFn: () => laravelRequest( settings, '/reports/meta' ),
            } ),
    } as Record< string, () => void >;
}

/**
 * Warms the react-query cache for one admin page, the same way the sidebar
 * links do. For in-app links: call it from onMouseEnter and onFocus.
 *
 * @param route The page's hash route, such as "/notifications".
 */
export function prefetchRoute( route: string ): void {
    const settings = getBootstrapSettings();

    if ( ! hasApiToken( settings ) ) {
        return;
    }

    prefetchEntries( settings )[ route ]?.();
}

let attached = false;

/**
 * Warms the react-query cache for a submenu item's page as soon as the user
 * hovers (or focuses) it in the WP admin sidebar, so the first render after
 * clicking finds fresh data already in cache instead of showing a loading
 * state. The submenu links live outside the React tree (rendered by
 * `Menus::add_menus()`), so this attaches plain DOM listeners rather than
 * using `<Link>`.
 */
export function attachHoverPrefetch(): void {
    if ( attached || typeof document === 'undefined' ) {
        return;
    }

    const menu = document.getElementById( 'toplevel_page_notifypress' );

    if ( ! menu ) {
        return;
    }

    attached = true;

    const links = menu.querySelectorAll< HTMLAnchorElement >( '.wp-submenu a' );

    links.forEach( ( link ) => {
        const route = link.hash.replace( /^#/, '' );

        const prefetch = () => {
            prefetchRoute( route );
        };

        link.addEventListener( 'mouseenter', prefetch, { passive: true } );
        link.addEventListener( 'focus', prefetch, { passive: true } );
    } );
}

import { laravelRequest } from './api';
import { getApiToken, getBootstrapSettings, hasApiToken } from './settings';
import { queryClient } from './query-client';
import type { NotifyPressSettings } from '../types';

// Mirrors the `queryKey`/`queryFn` each page's first-load `useQuery` call
// uses, so a hover-warmed cache entry is actually hit on navigation instead
// of triggering a second request.
function prefetchEntries( settings: NotifyPressSettings ) {
	const token = getApiToken( settings );

	return {
		'/dashboard': () =>
			queryClient.prefetchQuery( {
				queryKey: [ 'np-dashboard', token, settings.appUrl ],
				queryFn: () => laravelRequest( settings, '/dashboard' ),
			} ),
		'/subscribers': () => {
			queryClient.prefetchQuery( {
				queryKey: [ 'np-subscribers', token, '' ],
				queryFn: () =>
					laravelRequest( settings, '/subscribers', { query: {} } ),
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
		'/notifications': () =>
			queryClient.prefetchQuery( {
				queryKey: [ 'np-notifications', token, '', 'all' ],
				queryFn: () =>
					laravelRequest( settings, '/notifications', { query: {} } ),
			} ),
		'/automations': () =>
			queryClient.prefetchQuery( {
				queryKey: [ 'np-automations', token ],
				queryFn: () => laravelRequest( settings, '/automations' ),
			} ),
		'/analytics': () =>
			queryClient.prefetchQuery( {
				queryKey: [ 'np-analytics', token, settings.appUrl ],
				queryFn: () => laravelRequest( settings, '/analytics' ),
			} ),
		'/reports': () =>
			queryClient.prefetchQuery( {
				queryKey: [ 'np-reports-meta', token ],
				queryFn: () => laravelRequest( settings, '/reports/meta' ),
			} ),
	} as Record< string, () => void >;
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
			const settings = getBootstrapSettings();

			if ( ! hasApiToken( settings ) ) {
				return;
			}

			prefetchEntries( settings )[ route ]?.();
		};

		link.addEventListener( 'mouseenter', prefetch, { passive: true } );
		link.addEventListener( 'focus', prefetch, { passive: true } );
	} );
}

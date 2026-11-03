import type { ReactNode } from 'react';
import { useEffect } from '@wordpress/element';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'react-router-dom';
import { AlertTriangle, Settings } from 'lucide-react';
import {
    getBootstrapSettings,
    getSettings,
    hasApiToken,
} from '../lib/settings';
import { attachHoverPrefetch } from '../lib/prefetch-nav';
import Masthead from './masthead';

const items = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/subscribers', label: 'Subscribers' },
    { to: '/segments', label: 'Segments' },
    { to: '/notifications', label: 'Campaigns' },
    { to: '/automations', label: 'Automations' },
    { to: '/analytics', label: 'Analytics' },
    { to: '/reports', label: 'Reports' },
    { to: '/settings', label: 'Settings' },
];

export default function Shell( { children }: { children: ReactNode } ) {
    const location = useLocation();
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
        initialData: getBootstrapSettings(),
    } );
    const activePath =
        location.pathname === '/'
            ? '/dashboard'
            : location.pathname || window.location.hash.replace( /^#/, '' );
    const isSetupRoute = activePath.startsWith( '/setup' );

    useEffect( () => {
        attachHoverPrefetch();
    }, [] );

    const currentItem = items.find(
        ( item ) =>
            activePath === item.to || activePath.startsWith( `${ item.to }/` )
    );

    useEffect( () => {
        const menu = document.getElementById( 'toplevel_page_notifypress' );

        if ( ! menu ) {
            return;
        }

        menu.querySelectorAll( 'li' ).forEach( ( item ) => {
            item.classList.remove( 'current' );
        } );
        menu.querySelectorAll( 'a' ).forEach( ( link ) => {
            link.classList.remove( 'current' );
        } );

        const activeRoute = currentItem?.to || '/dashboard';
        const activeLink =
            activeRoute === '/dashboard'
                ? menu.querySelector< HTMLAnchorElement >(
                      '.wp-submenu li.wp-first-item > a'
                  )
                : Array.from(
                      menu.querySelectorAll< HTMLAnchorElement >(
                          '.wp-submenu a'
                      )
                  ).find( ( link ) => {
                      const hashRoute = link.hash.replace( /^#/, '' );

                      return (
                          hashRoute === activeRoute ||
                          hashRoute.startsWith( `${ activeRoute }/` )
                      );
                  } );

        if ( activeLink ) {
            activeLink.classList.add( 'current' );
            activeLink.closest( 'li' )?.classList.add( 'current' );
        }

        menu.classList.add( 'wp-has-current-submenu', 'wp-menu-open' );
        menu.classList.remove( 'wp-not-current-submenu' );
        menu
            .querySelector( 'a.wp-has-submenu' )
            ?.classList.add( 'wp-has-current-submenu' );
    }, [ currentItem ] );

    if ( isSetupRoute ) {
        return (
            <div className="min-h-screen bg-content-bg text-foreground">
                { children }
            </div>
        );
    }

    const showMissingTokenNotice =
        Boolean( settingsQuery.data?.setupCompleted ) &&
        ! hasApiToken( settingsQuery.data );

    return (
        <div className="min-h-screen bg-content-bg text-foreground md:h-[calc(100vh-32px)] md:min-h-0 md:overflow-hidden">
            <main className="min-w-0 md:h-full md:overflow-y-auto">
                <Masthead />

                { showMissingTokenNotice ? (
                    <section className="mt-8 mx-4 mb-0 flex flex-col gap-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-3">
                            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
                                <AlertTriangle className="h-4 w-4" />
                            </span>
                            <div>
                                <h3 className="text-sm font-semibold">
                                    API token required
                                </h3>
                                <p className="mt-1 text-sm text-amber-800">
                                    Connect NotifyPress or add an API token in
                                    Settings to sync this site.
                                </p>
                            </div>
                        </div>
                        <Link
                            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition-colors hover:bg-amber-100 hover:text-amber-900 focus:text-amber-900"
                            to="/settings"
                        >
                            <Settings className="h-4 w-4" />
                            Open Settings
                        </Link>
                    </section>
                ) : null }

                <div>{ children }</div>
            </main>
        </div>
    );
}

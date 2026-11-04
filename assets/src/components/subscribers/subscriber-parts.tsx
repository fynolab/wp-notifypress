import { Compass, Globe, Monitor, Smartphone, Tablet } from 'lucide-react';

import { cn } from '../utils';
import { Chip } from '../page-parts';
import { formatCount } from '../dashboard/format';

// Ported from the app's resources/js/Components/Subscribers/subscriber-parts.tsx;
// keep the class names in sync.

/**
 * Brand marks for the common browsers, as single-path SVGs from Simple Icons (CC0).
 * Inlined so the bundle needs no icon-font dependency. Safari uses Lucide's Compass,
 * and anything unknown falls back to a globe.
 */
const BROWSER_PATHS: Record< string, string > = {
    chrome: 'M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29zm13.342 2.166a5.446 5.446 0 0 1 1.45 7.09l.002.001h-.002l-5.344 9.257c.206.01.413.016.621.016 6.627 0 12-5.373 12-12 0-1.54-.29-3.011-.818-4.364zM12 16.364a4.364 4.364 0 1 1 0-8.728 4.364 4.364 0 0 1 0 8.728Z',
    firefox:
        'M8.824 7.287c.008 0 .004 0 0 0zm-2.8-1.4c.006 0 .003 0 0 0zm16.754 2.161c-.505-1.215-1.53-2.528-2.333-2.943.654 1.283 1.033 2.57 1.177 3.53l.002.02c-1.314-3.278-3.544-4.6-5.366-7.477-.091-.147-.184-.292-.273-.446a3.545 3.545 0 01-.13-.24 2.118 2.118 0 01-.172-.46.03.03 0 00-.027-.03.038.038 0 00-.021 0l-.006.001a.037.037 0 00-.01.005L15.624 0c-2.585 1.515-3.657 4.168-3.932 5.856a6.197 6.197 0 00-2.305.587.297.297 0 00-.147.37c.057.162.24.24.396.17a5.622 5.622 0 012.008-.523l.067-.005a5.847 5.847 0 011.957.222l.095.03a5.816 5.816 0 01.616.228c.08.036.16.073.238.112l.107.055a5.835 5.835 0 01.368.211 5.953 5.953 0 012.034 2.104c-.62-.437-1.733-.868-2.803-.681 4.183 2.09 3.06 9.292-2.737 9.02a5.164 5.164 0 01-1.513-.292 4.42 4.42 0 01-.538-.232c-1.42-.735-2.593-2.121-2.74-3.806 0 0 .537-2 3.845-2 .357 0 1.38-.998 1.398-1.287-.005-.095-2.029-.9-2.817-1.677-.422-.416-.622-.616-.8-.767a3.47 3.47 0 00-.301-.227 5.388 5.388 0 01-.032-2.842c-1.195.544-2.124 1.403-2.8 2.163h-.006c-.46-.584-.428-2.51-.402-2.913-.006-.025-.343.176-.389.206-.406.29-.787.616-1.136.974-.397.403-.76.839-1.085 1.303a9.816 9.816 0 00-1.562 3.52c-.003.013-.11.487-.19 1.073-.013.09-.026.181-.037.272a7.8 7.8 0 00-.069.667l-.002.034-.023.387-.001.06C.386 18.795 5.593 24 12.016 24c5.752 0 10.527-4.176 11.463-9.661.02-.149.035-.298.052-.448.232-1.994-.025-4.09-.753-5.844z',
    edge: 'M21.86 17.86q.14 0 .25.12.1.13.1.25t-.11.33l-.32.46-.43.53-.44.5q-.21.25-.38.42l-.22.23q-.58.53-1.34 1.04-.76.51-1.6.91-.86.4-1.74.64t-1.67.24q-.9 0-1.69-.28-.8-.28-1.48-.78-.68-.5-1.22-1.17-.53-.66-.92-1.44-.38-.77-.58-1.6-.2-.83-.2-1.67 0-1 .32-1.96.33-.97.87-1.8.14.95.55 1.77.41.82 1.02 1.5.6.68 1.38 1.21.78.54 1.64.9.86.36 1.77.56.92.2 1.8.2 1.12 0 2.18-.24 1.06-.23 2.06-.72l.2-.1.2-.05zm-15.5-1.27q0 1.1.27 2.15.27 1.06.78 2.03.51.96 1.24 1.77.74.82 1.66 1.4-1.47-.2-2.8-.74-1.33-.55-2.48-1.37-1.15-.83-2.08-1.9-.92-1.07-1.58-2.33T.36 14.94Q0 13.54 0 12.06q0-.81.32-1.49.31-.68.83-1.23.53-.55 1.2-.96.66-.4 1.35-.66.74-.27 1.5-.39.78-.12 1.55-.12.7 0 1.42.1.72.12 1.4.35.68.23 1.32.57.63.35 1.16.83-.35 0-.7.07-.33.07-.65.23v-.02q-.63.28-1.2.74-.57.46-1.05 1.04-.48.58-.87 1.26-.38.67-.65 1.39-.27.71-.42 1.44-.15.72-.15 1.38zM11.96.06q1.7 0 3.33.39 1.63.38 3.07 1.15 1.43.77 2.62 1.93 1.18 1.16 1.98 2.7.49.94.76 1.96.28 1 .28 2.08 0 .89-.23 1.7-.24.8-.69 1.48-.45.68-1.1 1.22-.64.53-1.45.88-.54.24-1.11.36-.58.13-1.16.13-.42 0-.97-.03-.54-.03-1.1-.12-.55-.1-1.05-.28-.5-.19-.84-.5-.12-.09-.23-.24-.1-.16-.1-.33 0-.15.16-.35.16-.2.35-.5.2-.28.36-.68.16-.4.16-.95 0-1.06-.4-1.96-.4-.91-1.06-1.64-.66-.74-1.52-1.28-.86-.55-1.79-.89-.84-.3-1.72-.44-.87-.14-1.76-.14-1.55 0-3.06.45T.94 7.55q.71-1.74 1.81-3.13 1.1-1.38 2.52-2.35Q6.68 1.1 8.37.58q1.7-.52 3.58-.52Z',
    opera: 'M8.051 5.238c-1.328 1.566-2.186 3.883-2.246 6.48v.564c.061 2.598.918 4.912 2.246 6.479 1.721 2.236 4.279 3.654 7.139 3.654 1.756 0 3.4-.537 4.807-1.471C17.879 22.846 15.074 24 12 24c-.192 0-.383-.004-.57-.014C5.064 23.689 0 18.436 0 12 0 5.371 5.373 0 12 0h.045c3.055.012 5.84 1.166 7.953 3.055-1.408-.93-3.051-1.471-4.81-1.471-2.858 0-5.417 1.42-7.14 3.654h.003zM24 12c0 3.556-1.545 6.748-4.002 8.945-3.078 1.5-5.946.451-6.896-.205 3.023-.664 5.307-4.32 5.307-8.74 0-4.422-2.283-8.075-5.307-8.74.949-.654 3.818-1.703 6.896-.205C22.455 5.25 24 8.445 24 12z',
};

function browserKey( browser: string ): string | null {
    const name = browser.toLowerCase();
    if ( name.includes( 'edge' ) ) {
        return 'edge';
    }

    if ( name.includes( 'opera' ) || name.includes( 'opr' ) ) {
        return 'opera';
    }

    if ( name.includes( 'firefox' ) ) {
        return 'firefox';
    }

    if ( name.includes( 'chrome' ) || name.includes( 'chromium' ) ) {
        return 'chrome';
    }

    if ( name.includes( 'safari' ) ) {
        return 'safari';
    }

    return null;
}

export function BrowserIcon( {
    browser,
    className,
}: {
    browser: string;
    className?: string;
} ) {
    const key = browserKey( browser || '' );

    if ( key === 'safari' ) {
        return <Compass className={ className } aria-hidden />;
    }

    if ( key && BROWSER_PATHS[ key ] ) {
        return (
            <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className={ className }
                aria-hidden
            >
                <path d={ BROWSER_PATHS[ key ] } />
            </svg>
        );
    }

    return <Globe className={ className } aria-hidden />;
}

/**
 * Icon for a subscriber's device type.
 *
 * @param {Object} props           Component props.
 * @param {string} props.device    Device name as stored on the subscriber.
 * @param {string} props.className Classes for the icon.
 */
export function DeviceIcon( {
    device,
    className,
}: {
    device?: string;
    className?: string;
} ) {
    const name = ( device || '' ).toLowerCase();

    if ( name.includes( 'mobile' ) || name.includes( 'phone' ) ) {
        return <Smartphone className={ className } aria-hidden />;
    }

    if ( name.includes( 'tablet' ) ) {
        return <Tablet className={ className } aria-hidden />;
    }

    return <Monitor className={ className } aria-hidden />;
}

/**
 * Active / Inactive chip for a subscriber.
 *
 * @param {Object}  props        Component props.
 * @param {boolean} props.active Whether the subscriber can receive pushes.
 */
export function StatusChip( { active }: { active?: boolean } ) {
    return (
        <Chip tone={ active ? 'success' : 'neutral' } dot>
            { active ? 'Active' : 'Inactive' }
        </Chip>
    );
}

function Stat( {
    label,
    value,
    dot,
}: {
    label: string;
    value: number;
    dot: string;
} ) {
    return (
        <div className="flex min-w-0 flex-col gap-1">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <span
                    className={ cn( 'h-2 w-2 rounded-full', dot ) }
                    aria-hidden
                />
                { label }
            </p>
            <p className="font-display text-2xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
                { formatCount( value ) }
            </p>
        </div>
    );
}

/**
 * Small ring showing the share of subscribers that are active.
 *
 * @param {Object} props       Component props.
 * @param {number} props.share Active share, 0 to 100.
 */
function ReachRing( { share }: { share: number } ) {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;

    return (
        <div
            className="relative h-12 w-12 shrink-0"
            role="img"
            aria-label={ `${ share }% of subscribers are active` }
        >
            <svg
                viewBox="0 0 48 48"
                className="h-12 w-12 -rotate-90"
                aria-hidden
            >
                <circle
                    cx="24"
                    cy="24"
                    r={ radius }
                    fill="none"
                    strokeWidth="5"
                    className="stroke-muted"
                />
                <circle
                    cx="24"
                    cy="24"
                    r={ radius }
                    fill="none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={ circumference }
                    strokeDashoffset={ circumference * ( 1 - share / 100 ) }
                    className="stroke-emerald-500 transition-[stroke-dashoffset] duration-700"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-foreground">
                { share }%
            </span>
        </div>
    );
}

/**
 * Totals for the whole site (not just this page), with the share of
 * subscribers that can still receive notifications.
 *
 * @param {Object}  props        Component props.
 * @param {number}  props.total  All subscribers on the site.
 * @param {?number} props.active Subscribers that are still reachable, or null when unknown.
 */
export function SubscriberStats( {
    total,
    active,
}: {
    total: number;
    // null when the app does not send the active count yet (older app
    // versions): only the total is shown rather than a misleading "Active 0".
    active: number | null;
} ) {
    if ( active === null ) {
        return (
            <section
                aria-label="Subscriber totals"
                className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
            >
                <Stat label="Total" value={ total } dot="bg-primary" />
            </section>
        );
    }

    const inactive = Math.max( 0, total - active );
    const share =
        total > 0 ? Math.min( 100, Math.round( ( active / total ) * 100 ) ) : 0;

    return (
        <section
            aria-label="Subscriber totals"
            className="grid grid-cols-3 gap-x-4 gap-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-[repeat(3,minmax(0,auto))_minmax(0,1fr)] sm:items-center sm:gap-x-10 sm:p-5"
        >
            <Stat label="Total" value={ total } dot="bg-primary" />
            <Stat
                label="Active"
                value={ active }
                dot="bg-emerald-600 dark:bg-emerald-400"
            />
            <Stat
                label="Inactive"
                value={ inactive }
                dot="bg-muted-foreground/50"
            />
            <div className="col-span-3 flex items-center gap-3 border-t border-border pt-4 sm:col-span-1 sm:justify-self-end sm:border-0 sm:pt-0">
                <ReachRing share={ share } />
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                        Reachable now
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                        { formatCount( active ) } of { formatCount( total ) }{ ' ' }
                        can get your next push notification
                    </p>
                </div>
            </div>
        </section>
    );
}

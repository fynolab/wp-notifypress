import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from '@wordpress/element';
import {
    ArrowLeft,
    Clock,
    Eye,
    Filter,
    MousePointerClick,
    TrendingDown,
    TrendingUp,
    UserPlus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { laravelRequest } from '../../lib/api';
import { cn } from '../utils';
import { flagFromCode } from './country-codes';
import type { NotifyPressSettings, LaravelResource } from '../../types';
import type { Breakdown, CountryEngagement, CountryInsights } from './types';

type Props = {
    code: string;
    settings?: NotifyPressSettings;
    onBack: () => void;
    // Called once the details have loaded or failed, so the parent can stop
    // holding the panel open at its previous height.
    onSettled?: () => void;
};

function useLocalTime( timezone: string | null ): string | null {
    const [ now, setNow ] = useState( () => new Date() );

    useEffect( () => {
        const timer = setInterval( () => {
            setNow( new Date() );
        }, 30_000 );

        return () => clearInterval( timer );
    }, [] );

    if ( ! timezone ) {
        return null;
    }

    try {
        return new Intl.DateTimeFormat( undefined, {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: timezone,
        } ).format( now );
    } catch {
        return null;
    }
}

function capitalize( value: string ): string {
    return value.charAt( 0 ).toUpperCase() + value.slice( 1 );
}

function BreakdownList( {
    title,
    rows,
    formatName = ( name ) => name,
}: {
    title: string;
    rows: Breakdown[];
    formatName?: ( name: string ) => string;
} ) {
    return (
        <div>
            <h5 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                { title }
            </h5>
            { rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data yet</p>
            ) : (
                <ul className="space-y-2">
                    { rows.map( ( row ) => (
                        <li key={ row.name }>
                            <div className="flex items-center justify-between text-sm">
                                <span className="truncate text-foreground">
                                    { formatName( row.name ) }
                                </span>
                                <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
                                    { row.subscribers.toLocaleString() } ·{ ' ' }
                                    { row.percentage }%
                                </span>
                            </div>
                            <div className="mt-1 h-1.5 rounded-full bg-secondary">
                                <div
                                    className="h-full rounded-full bg-primary/70"
                                    style={ { width: `${ row.percentage }%` } }
                                />
                            </div>
                        </li>
                    ) ) }
                </ul>
            ) }
        </div>
    );
}

function ctrComparison(
    engagement: CountryEngagement
): { label: string; above: boolean } | null {
    if (
        null === engagement.ctr ||
        null === engagement.siteCtr ||
        0 === engagement.siteCtr
    ) {
        return null;
    }

    const ratio = engagement.ctr / engagement.siteCtr;

    return {
        label: `${ ratio.toFixed( 1 ) }× your ${ engagement.siteCtr }% average`,
        above: ratio >= 1,
    };
}

function EngagementSummary( {
    engagement,
    countryName,
}: {
    engagement: CountryEngagement;
    countryName: string;
} ) {
    const comparison = ctrComparison( engagement );

    return (
        <div>
            <h5 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Engagement (30 days)
            </h5>
            { 0 === engagement.views && 0 === engagement.clicks ? (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                    No tracked views from { countryName } in the last 30 days
                    yet.
                </p>
            ) : (
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Eye className="h-3.5 w-3.5" />
                            Views
                        </div>
                        <div className="mt-1 text-xl font-bold tabular-nums text-foreground">
                            { engagement.views.toLocaleString() }
                        </div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MousePointerClick className="h-3.5 w-3.5" />
                            Clicks
                        </div>
                        <div className="mt-1 text-xl font-bold tabular-nums text-foreground">
                            { engagement.clicks.toLocaleString() }
                        </div>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                        <div className="text-xs text-muted-foreground">
                            Click rate
                        </div>
                        <div className="mt-1 text-xl font-bold tabular-nums text-foreground">
                            { null === engagement.ctr
                                ? '—'
                                : `${ engagement.ctr }%` }
                        </div>
                        { comparison ? (
                            <div
                                className={ cn(
                                    'mt-0.5 text-xs font-medium',
                                    comparison.above
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-amber-600 dark:text-amber-400'
                                ) }
                            >
                                { comparison.label }
                            </div>
                        ) : null }
                    </div>
                </div>
            ) }
        </div>
    );
}

export function CountryDetails( { code, settings, onBack, onSettled }: Props ) {
    const query = useQuery( {
        queryKey: [ 'np-dashboard-country', code ],
        enabled: Boolean( settings ),
        queryFn: () =>
            laravelRequest< LaravelResource< CountryInsights > >(
                settings,
                `/dashboard/countries/${ code }`
            ),
    } );
    const insights = query.data?.data ?? null;
    const localTime = useLocalTime( insights?.timezone ?? null );
    const settled = Boolean( insights ) || query.isError;

    useEffect( () => {
        if ( settled ) {
            onSettled?.();
        }
    }, [ settled, onSettled ] );

    useEffect( () => {
        function handleKeyDown( event: KeyboardEvent ) {
            if ( event.key === 'Escape' ) {
                onBack();
            }
        }

        document.addEventListener( 'keydown', handleKeyDown );

        return () => document.removeEventListener( 'keydown', handleKeyDown );
    }, [ onBack ] );

    const growthUp = ( insights?.growthRate ?? 0 ) >= 0;

    return (
        <div className="space-y-5">
            <button
                type="button"
                onClick={ onBack }
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
                <ArrowLeft className="h-4 w-4" />
                All countries
            </button>

            { query.isError ? (
                <div className="rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
                    Could not load details for this country. Please try again.
                </div>
            ) : null }

            { ! query.isError && ! insights ? (
                <div className="space-y-3">
                    <div className="h-12 animate-pulse rounded-lg bg-muted/60" />
                    <div className="grid grid-cols-3 gap-3">
                        <div className="h-20 animate-pulse rounded-lg bg-muted/60" />
                        <div className="h-20 animate-pulse rounded-lg bg-muted/60" />
                        <div className="h-20 animate-pulse rounded-lg bg-muted/60" />
                    </div>
                    <div className="h-32 animate-pulse rounded-lg bg-muted/60" />
                </div>
            ) : null }

            { insights ? (
                <>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-2xl">
                            { insights.flag ?? flagFromCode( insights.code ) }
                        </div>
                        <div>
                            <h4 className="text-lg font-semibold text-foreground">
                                { insights.name }
                            </h4>
                            <p className="text-sm text-muted-foreground">
                                { insights.subscribers.toLocaleString() }{ ' ' }
                                subscribers · { insights.percentage }% of your
                                audience
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <UserPlus className="h-3.5 w-3.5" />
                                New (30 days)
                            </div>
                            <div className="mt-1 text-xl font-bold text-foreground">
                                { insights.newLast30Days.toLocaleString() }
                            </div>
                            <div
                                className={ cn(
                                    'mt-0.5 inline-flex items-center gap-1 text-xs font-medium',
                                    growthUp
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-red-600 dark:text-red-400'
                                ) }
                            >
                                { growthUp ? (
                                    <TrendingUp className="h-3 w-3" />
                                ) : (
                                    <TrendingDown className="h-3 w-3" />
                                ) }
                                { growthUp ? '+' : '' }
                                { insights.growthRate }% vs prior 30 days
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-3">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Clock className="h-3.5 w-3.5" />
                                Local time now
                            </div>
                            <div className="mt-1 text-xl font-bold text-foreground">
                                { localTime ?? '—' }
                            </div>
                            <div className="mt-0.5 truncate text-xs text-muted-foreground">
                                { insights.timezone ?? 'Timezone unknown' }
                            </div>
                        </div>

                        <div className="rounded-lg border border-border p-3">
                            <div className="text-xs text-muted-foreground">
                                Top device
                            </div>
                            <div className="mt-1 text-xl font-bold text-foreground">
                                { insights.devices[ 0 ]
                                    ? capitalize( insights.devices[ 0 ].name )
                                    : '—' }
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                                { insights.devices[ 0 ]
                                    ? `${ insights.devices[ 0 ].percentage }% of subscribers`
                                    : 'No data yet' }
                            </div>
                        </div>
                    </div>

                    <EngagementSummary
                        engagement={ insights.engagement }
                        countryName={ insights.name }
                    />

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <BreakdownList
                            title="Top cities"
                            rows={ insights.cities }
                        />
                        <div className="space-y-5">
                            <BreakdownList
                                title="Devices"
                                rows={ insights.devices }
                                formatName={ capitalize }
                            />
                            <BreakdownList
                                title="Browsers"
                                rows={ insights.browsers }
                                formatName={ capitalize }
                            />
                        </div>
                    </div>

                    <Link
                        to="/segments/new"
                        state={ { prefillLocations: insights.storedNames } }
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                        <Filter className="h-4 w-4" />
                        Create segment for { insights.name }
                    </Link>
                </>
            ) : null }
        </div>
    );
}

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from '@wordpress/element';
import {
    ArrowRight,
    CalendarClock,
    ListChecks,
    MapPin,
    Megaphone,
    Plus,
    Repeat,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Card } from '../components/ui/card';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import { isUnauthorizedError, laravelRequest } from '../lib/api';
import useLiveActivity from '../lib/use-live-activity';
import { prefetchRoute } from '../lib/prefetch-nav';
import LiveActivityPanel from '../components/live-activity-panel';
import { cn } from '../components/utils';
import { WorldChoropleth } from '../components/world-map/world-choropleth';
import { CountryDetails } from '../components/world-map/country-details';
import { flagFromCode } from '../components/world-map/country-codes';
import type { MapCountry } from '../components/world-map/types';
import {
    formatDateTime,
    formatRelativeDate,
    toNumber,
} from '../components/dashboard/format';
import {
    CampaignsSentCard,
    ClickRateCard,
    SubscribersCard,
    UpcomingCard,
} from '../components/dashboard/kpi-cards';
import { PlanLimitBanner } from '../components/dashboard/plan-limit-banner';
import { GettingStarted } from '../components/dashboard/getting-started';
import { DashboardInsight } from '../components/dashboard/dashboard-insight';
import { SubscriberGrowth } from '../components/dashboard/subscriber-growth';
import { DevicesBrowsers } from '../components/dashboard/devices-browsers';
import type {
    DashboardCampaign,
    DashboardCountry,
    DashboardData,
    LaravelResource,
    NotifyPressSettings,
} from '../types';

// Share bar colour per rank, matching the map's splash rings for the top countries.
const RANK_COLORS = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-cyan-500',
    'bg-emerald-500',
    'bg-amber-500',
];

const CAMPAIGN_DOTS: Record< string, string > = {
    sent: 'bg-emerald-600 dark:bg-emerald-400',
    sending: 'bg-primary animate-pulse',
    scheduled: 'bg-primary',
    recurring: 'bg-violet-500',
    failed: 'bg-red-600 dark:bg-red-400',
    cancelled: 'bg-muted-foreground/50',
    pending: 'bg-muted-foreground/50',
};

function useDashboardData() {
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );

    const dashboardQuery = useQuery( {
        queryKey: [ 'np-dashboard', getApiToken( settingsQuery.data ) ],
        enabled: hasApiToken( settingsQuery.data ),
        queryFn: () =>
            laravelRequest< LaravelResource< DashboardData > >(
                settingsQuery.data,
                '/dashboard'
            ),
    } );

    return { settingsQuery, dashboardQuery };
}

function StateView( {
    title,
    description,
    action,
}: {
    title: string;
    description: string;
    action?: ReactNode;
} ) {
    return (
        <section className="rounded-xl border border-border bg-card p-8 text-center text-card-foreground shadow">
            <h3 className="text-lg font-semibold text-foreground">{ title }</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                { description }
            </p>
            { action ? <div className="mt-5">{ action }</div> : null }
        </section>
    );
}

function greetingFor( hour: number ): string {
    if ( hour < 12 ) {
        return 'Good morning';
    }

    if ( hour < 18 ) {
        return 'Good afternoon';
    }

    return 'Good evening';
}

function siteNameFor( settings?: NotifyPressSettings ): string | null {
    if ( settings?.siteName ) {
        return settings.siteName;
    }

    const url = settings?.siteUrl || window.notifypress?.siteUrl || '';

    return (
        url
            .replace( /(^\w+:|^)\/\//, '' )
            .replace( /^www\./, '' )
            .split( '/' )[ 0 ] || null
    );
}

function DashboardHeader( { isNew }: { isNew: boolean } ) {
    // The viewer's own clock: "morning" is local.
    const { greeting, today } = useMemo( () => {
        const now = new Date();

        return {
            greeting: greetingFor( now.getHours() ),
            today: new Intl.DateTimeFormat( undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
            } ).format( now ),
        };
    }, [] );

    return (
        <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                <p className="mb-1 text-sm text-muted-foreground">{ today }</p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    { isNew ? 'Welcome to NotifyPress' : greeting }
                </h1>
                <p className="mt-1.5 text-muted-foreground">
                    { isNew
                        ? 'Let us get your first subscribers in.'
                        : 'Here is how your push notifications did over the last 30 days.' }
                </p>
            </div>
            { isNew ? null : (
                <div className="flex flex-wrap gap-2">
                    <Link
                        to="/notifications"
                        onMouseEnter={ () => prefetchRoute( '/notifications' ) }
                        onFocus={ () => prefetchRoute( '/notifications' ) }
                        className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                        <ListChecks className="h-4 w-4" aria-hidden />
                        All campaigns
                    </Link>
                    <Link
                        to="/notifications/new"
                        onMouseEnter={ () =>
                            prefetchRoute( '/notifications/new' )
                        }
                        onFocus={ () => prefetchRoute( '/notifications/new' ) }
                        className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:text-primary-foreground"
                    >
                        <Plus className="h-4 w-4" aria-hidden />
                        New campaign
                    </Link>
                </div>
            ) }
        </div>
    );
}

// Placeholder cards while the dashboard loads, so a real account never
// flashes zeros or the getting-started checklist.
function LoadingCards() {
    return (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            { [ 0, 1, 2, 3 ].map( ( index ) => (
                <div
                    key={ index }
                    className="h-[212px] animate-pulse rounded-xl border border-border bg-card"
                />
            ) ) }
        </div>
    );
}

function TopCountriesMap( {
    countries,
    mapCountries,
    subscribersWithoutCountry,
    totalCountries,
    totalSubscribers,
    settings,
    dataReady,
    loading,
    className,
}: {
    countries?: DashboardCountry[];
    mapCountries?: MapCountry[];
    subscribersWithoutCountry?: number;
    totalCountries?: string | number;
    totalSubscribers?: string | number;
    settings?: NotifyPressSettings;
    dataReady: boolean;
    loading: boolean;
    className?: string;
} ) {
    const rows = countries || [];
    const mapRows = mapCountries || [];
    const [ hoveredCode, setHoveredCode ] = useState< string | null >( null );
    const [ selectedCode, setSelectedCode ] = useState< string | null >( null );
    // Height the panel below the map is held at while a country's details load.
    // The loading skeleton is shorter than the list it replaces, and that brief
    // shrink pulled the page down when it was scrolled (then back up on load).
    const panelRef = useRef< HTMLDivElement >( null );
    const [ panelMinHeight, setPanelMinHeight ] = useState< number | null >(
        null
    );

    // The API formats totals as strings ("1,234"), so derive counts from raw rows.
    const totalWithCountry = mapRows.reduce(
        ( sum, country ) => sum + country.subscribers,
        0
    );
    const withoutCountry = Number( subscribersWithoutCountry || 0 );
    const audience = totalWithCountry + withoutCountry;
    const isEmpty = dataReady && 0 === audience;
    const unknownShare =
        audience > 0 ? Math.round( ( withoutCountry / audience ) * 100 ) : 0;
    const countryCount = toNumber( totalCountries );
    const located = toNumber( totalSubscribers ) - withoutCountry;
    const topShare = Math.max( Number( rows[ 0 ]?.percentage || 0 ), 1 );
    let subtitle = 'Where your subscribers are';

    if ( dataReady ) {
        subtitle = isEmpty
            ? 'No subscribers yet'
            : `${ located.toLocaleString() } located ${
                  1 === located ? 'subscriber' : 'subscribers'
              } in ${ countryCount } ${
                  1 === countryCount ? 'country' : 'countries'
              }`;
    }

    const selectCountry = useCallback( ( code: string | null ) => {
        if ( null !== code && panelRef.current ) {
            setPanelMinHeight( panelRef.current.offsetHeight );
        } else {
            setPanelMinHeight( null );
        }

        setSelectedCode( code );
    }, [] );

    const clearSelection = useCallback( () => {
        selectCountry( null );
    }, [ selectCountry ] );

    const releasePanelHeight = useCallback( () => {
        setPanelMinHeight( null );
    }, [] );

    return (
        <Card
            className={ cn(
                'p-4 sm:p-6 bg-card border-border overflow-hidden relative transition-opacity duration-500',
                loading ? 'opacity-75' : 'opacity-100',
                className
            ) }
        >
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                    Audience
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    { subtitle }
                </p>
            </div>

            <div className="relative mb-2 aspect-[960/440] w-full overflow-hidden rounded-xl border border-border/50 bg-gradient-to-b from-muted/50 to-card p-2 dark:from-background/70 dark:to-card">
                { /* Fade the map into the card at the bottom, like the original static image. */ }
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-1/4 bg-gradient-to-t from-card/80 to-transparent" />
                <WorldChoropleth
                    countries={ mapRows }
                    topCodes={ rows.map( ( country ) => country.code || null ) }
                    totalWithCountry={ totalWithCountry }
                    hoveredCode={ hoveredCode }
                    selectedCode={ selectedCode }
                    muted={ isEmpty }
                    onHover={ setHoveredCode }
                    onSelect={ ( code ) => {
                        selectCountry( selectedCode === code ? null : code );
                    } }
                />

                { isEmpty ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="max-w-xs space-y-2 rounded-2xl border border-border/50 bg-card/70 px-6 py-5 text-center backdrop-blur-sm">
                            <div className="flex items-center justify-center gap-2">
                                <MapPin className="h-5 w-5 text-primary" />
                                <p className="text-sm font-medium text-foreground">
                                    No subscribers yet
                                </p>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Visitors who opt in on your site will appear
                                here.
                            </p>
                        </div>
                    </div>
                ) : null }
            </div>

            { ! isEmpty && withoutCountry > 0 ? (
                <p className="mb-4 text-xs text-muted-foreground">
                    { withoutCountry.toLocaleString() } subscribers (
                    { unknownShare }%) have no known location.
                </p>
            ) : (
                <div className="mb-4" />
            ) }

            <div
                ref={ panelRef }
                style={
                    null === panelMinHeight
                        ? undefined
                        : { minHeight: panelMinHeight }
                }
            >
                { selectedCode ? (
                    <CountryDetails
                        code={ selectedCode }
                        settings={ settings }
                        onBack={ clearSelection }
                        onSettled={ releasePanelHeight }
                    />
                ) : (
                    <ul
                        className={ cn(
                            'flex flex-col gap-0.5 transition-opacity duration-500',
                            dataReady ? 'opacity-100' : 'opacity-80'
                        ) }
                    >
                        { rows.length ? (
                            rows.map( ( country, index ) => {
                                const percentage = Number(
                                    country.percentage || 0
                                );
                                const growth = Number(
                                    country.growth_rate || 0
                                );
                                const growthUp = growth >= 0;
                                const code = country.code || null;
                                const name =
                                    country.name ||
                                    country.country ||
                                    'Unknown';
                                const subscribers = toNumber(
                                    country.subscribers
                                );
                                const growthLabel = `${
                                    growthUp ? '+' : '−'
                                }${ Math.abs( growth ) }%`;
                                const growthColor = growthUp
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-orange-700 dark:text-orange-400';

                                return (
                                    <li key={ code || name || index }>
                                        <button
                                            type="button"
                                            disabled={ ! code }
                                            aria-label={ `${ name }, ${ subscribers.toLocaleString() } subscribers, ${ percentage } percent. Show details.` }
                                            onClick={ () => {
                                                if ( code ) {
                                                    selectCountry( code );
                                                }
                                            } }
                                            onMouseEnter={ () => {
                                                setHoveredCode( code );
                                            } }
                                            onMouseLeave={ () => {
                                                setHoveredCode( null );
                                            } }
                                            onFocus={ () => {
                                                setHoveredCode( code );
                                            } }
                                            onBlur={ () => {
                                                setHoveredCode( null );
                                            } }
                                            className={ cn(
                                                'flex min-h-[52px] w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted/70 enabled:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                                code && code === hoveredCode
                                                    ? 'bg-muted/70'
                                                    : null
                                            ) }
                                        >
                                            <span
                                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-lg"
                                                aria-hidden
                                            >
                                                { country.flag ||
                                                    flagFromCode( code ) }
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block truncate font-semibold text-foreground">
                                                    { name }
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    { subscribers.toLocaleString() }{ ' ' }
                                                    subscribers
                                                    { /* On phones the growth column moves here to give the name room. */ }
                                                    <span
                                                        className={ cn(
                                                            'font-semibold sm:hidden',
                                                            growthColor
                                                        ) }
                                                    >
                                                        { ` · ${ growthLabel }` }
                                                    </span>
                                                </span>
                                            </span>
                                            <span
                                                className="hidden h-1.5 w-28 shrink overflow-hidden rounded-full bg-secondary sm:block"
                                                aria-hidden
                                            >
                                                <span
                                                    className={ cn(
                                                        'block h-full rounded-full',
                                                        RANK_COLORS[
                                                            index %
                                                                RANK_COLORS.length
                                                        ]
                                                    ) }
                                                    style={ {
                                                        width: `${ Math.min(
                                                            100,
                                                            ( percentage /
                                                                topShare ) *
                                                                100
                                                        ) }%`,
                                                    } }
                                                />
                                            </span>
                                            <span className="w-14 shrink-0 text-right font-semibold text-foreground">
                                                { percentage }%
                                            </span>
                                            <span
                                                className={ cn(
                                                    'hidden w-16 shrink-0 text-right text-xs font-semibold sm:block',
                                                    growthColor
                                                ) }
                                                title="New subscribers last month vs the month before"
                                            >
                                                { growthLabel }
                                            </span>
                                        </button>
                                    </li>
                                );
                            } )
                        ) : (
                            <li className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                                No country breakdown available yet.
                            </li>
                        ) }
                    </ul>
                ) }
            </div>
        </Card>
    );
}

function campaignMeta( campaign: DashboardCampaign ): string {
    const date = String(
        campaign.date ||
            campaign.sent_at ||
            campaign.scheduled_at ||
            campaign.created_at ||
            ''
    );
    const analytics =
        typeof campaign.analytics === 'object' && campaign.analytics
            ? campaign.analytics
            : {};

    switch ( campaign.status ) {
        case 'sent':
            return `Sent ${ formatRelativeDate( date ) } · ${ toNumber(
                analytics.views
            ).toLocaleString() } views`;
        case 'sending':
            return 'Sending now';
        case 'scheduled':
            return `Goes out ${ formatDateTime( date ) }`;
        case 'recurring':
            return `Next send ${ formatDateTime( date ) }`;
        case 'failed':
            return `Failed · created ${ formatRelativeDate( date ) }`;
        case 'cancelled':
            return `Cancelled · created ${ formatRelativeDate( date ) }`;
        default:
            return `Created ${ formatRelativeDate( date ) }`;
    }
}

function clickRateOf( campaign: DashboardCampaign ): number {
    const analytics =
        typeof campaign.analytics === 'object' && campaign.analytics
            ? campaign.analytics
            : {};

    return toNumber( analytics.click_through_rate );
}

function RecentCampaigns( {
    campaigns,
    loading,
    className,
}: {
    campaigns?: DashboardCampaign[];
    loading: boolean;
    className?: string;
} ) {
    const rows = campaigns || [];
    // Click-rate bars are relative to the best campaign in the list.
    const bestRate = Math.max(
        1,
        ...rows
            .filter( ( campaign ) => 'sent' === campaign.status )
            .map( clickRateOf )
    );

    return (
        <Card
            className={ cn(
                'flex flex-col border-border bg-card p-5 shadow-sm transition-opacity duration-500 sm:p-6',
                loading ? 'opacity-75' : 'opacity-100',
                className
            ) }
        >
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Recent campaigns
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Newest first
                    </p>
                </div>
                <Link
                    to="/notifications"
                    onMouseEnter={ () => prefetchRoute( '/notifications' ) }
                    onFocus={ () => prefetchRoute( '/notifications' ) }
                    className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap text-sm font-semibold text-primary hover:underline"
                >
                    View all
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            </div>

            { rows.length ? (
                <>
                    <ul className="mt-3.5">
                        { rows.map( ( campaign ) => {
                            const status = String(
                                campaign.status || 'pending'
                            );
                            const rate = clickRateOf( campaign );

                            return (
                                <li
                                    key={ campaign.id }
                                    className="flex items-center gap-3 border-t border-border py-3.5"
                                >
                                    <span
                                        className={ cn(
                                            'h-2 w-2 shrink-0 rounded-full',
                                            CAMPAIGN_DOTS[ status ] ||
                                                CAMPAIGN_DOTS.pending
                                        ) }
                                        aria-hidden
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="line-clamp-2 font-semibold text-foreground sm:line-clamp-none sm:truncate">
                                            { campaign.title ||
                                                'Untitled campaign' }
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            { campaignMeta( campaign ) }
                                        </p>
                                    </div>
                                    { 'sent' === status ? (
                                        <div className="w-[64px] shrink-0 text-right sm:w-[76px]">
                                            <p className="text-base font-semibold leading-tight text-foreground">
                                                { rate }%
                                            </p>
                                            <p className="mb-1 text-[11px] text-muted-foreground">
                                                click rate
                                            </p>
                                            <div
                                                className="h-1 overflow-hidden rounded-full bg-muted"
                                                aria-hidden
                                            >
                                                <div
                                                    className="h-full rounded-full bg-primary"
                                                    style={ {
                                                        width: `${ Math.min(
                                                            100,
                                                            ( rate /
                                                                bestRate ) *
                                                                100
                                                        ) }%`,
                                                    } }
                                                />
                                            </div>
                                        </div>
                                    ) : null }
                                    { 'scheduled' === status ? (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                            <CalendarClock
                                                className="h-3 w-3"
                                                aria-hidden
                                            />
                                            Scheduled
                                        </span>
                                    ) : null }
                                    { 'recurring' === status ? (
                                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                                            <Repeat
                                                className="h-3 w-3"
                                                aria-hidden
                                            />
                                            Recurring
                                        </span>
                                    ) : null }
                                </li>
                            );
                        } ) }
                    </ul>
                    <p className="mt-auto border-t border-border pt-3.5 text-xs text-muted-foreground">
                        Welcome and automation messages are not listed here.
                    </p>
                </>
            ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-4 py-10 text-center">
                    <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                        aria-hidden
                    >
                        <Megaphone className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-foreground">
                        No campaigns yet
                    </p>
                    <p className="max-w-64 text-sm text-muted-foreground">
                        Campaigns you send or schedule show up here with their
                        click rates.
                    </p>
                    <Link
                        to="/notifications/new"
                        className="mt-1 inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted"
                    >
                        Write a draft
                    </Link>
                </div>
            ) }
        </Card>
    );
}

export default function DashboardPage() {
    const { settingsQuery, dashboardQuery } = useDashboardData();
    const { liveSends, markCancelling } = useLiveActivity();

    if (
        dashboardQuery.isError &&
        ! isUnauthorizedError( dashboardQuery.error )
    ) {
        return (
            <StateView
                title="Dashboard unavailable"
                description={
                    dashboardQuery.error instanceof Error
                        ? dashboardQuery.error.message
                        : 'Unable to load dashboard data.'
                }
            />
        );
    }

    const data: DashboardData = dashboardQuery.data?.data ?? {};
    const dataReady = Boolean( dashboardQuery.data?.data );
    const loading = dashboardQuery.isFetching && ! dataReady;
    const settings = settingsQuery.data;
    const siteName = siteNameFor( settings );
    const totalSubscribers = toNumber( data.totalSubscribers );
    // A site that has never had a subscriber gets the setup checklist instead
    // of cards full of zeros. Only once the data is in, never while loading.
    const isNew = dataReady && 0 === totalSubscribers;
    const activeSubscribers = data.activeSubscribers ?? 0;
    const growth = data.growth ?? [];
    // An app that predates these cards sends none of their fields: show
    // nothing rather than placeholders that never resolve.
    let topSection: ReactNode = dataReady ? null : <LoadingCards />;

    if ( isNew ) {
        topSection = <GettingStarted siteName={ siteName } />;
    } else if (
        dataReady &&
        data.plan &&
        data.subscriberChange &&
        data.campaignsSent &&
        data.recentClickRate &&
        data.upcoming
    ) {
        topSection = (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <SubscribersCard
                    active={ activeSubscribers }
                    change={ data.subscriberChange }
                    plan={ data.plan }
                    growth={ growth }
                />
                <CampaignsSentCard sent={ data.campaignsSent } />
                <ClickRateCard
                    recent={ data.recentClickRate }
                    allTime={ data.clickRate ?? 0 }
                    change={ data.clickRateChange ?? null }
                    weekly={ data.weeklyClickRates ?? [] }
                />
                <UpcomingCard upcoming={ data.upcoming } />
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            <DashboardHeader isNew={ isNew } />

            { data.plan ? (
                <PlanLimitBanner
                    plan={ data.plan }
                    activeSubscribers={ activeSubscribers }
                    siteKey={ settings?.siteKey || 'site' }
                />
            ) : null }

            { dataReady &&
            ! isNew &&
            data.subscriberChange &&
            data.recentClickRate &&
            data.upcoming ? (
                <DashboardInsight
                    change={ data.subscriberChange }
                    recent={ data.recentClickRate }
                    clickRateChange={ data.clickRateChange ?? null }
                    devices={ data.devices ?? [] }
                    upcoming={ data.upcoming }
                />
            ) : null }

            { topSection }

            { liveSends.length > 0 ? (
                <LiveActivityPanel
                    sends={ liveSends }
                    onMarkCancelling={ markCancelling }
                />
            ) : null }

            { /* The map gets the wider column (3/5) on large screens; between lg and
                xl the two cards stay half and half so the right column keeps room. */ }
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                <TopCountriesMap
                    className="xl:col-span-3"
                    countries={ data.topCountries }
                    mapCountries={ data.mapCountries }
                    subscribersWithoutCountry={ data.subscribersWithoutCountry }
                    settings={ settings }
                    dataReady={ dataReady }
                    loading={ loading }
                    totalCountries={ data.totalCountries }
                    totalSubscribers={ data.totalSubscribers }
                />
                <RecentCampaigns
                    className="xl:col-span-2"
                    campaigns={ data.recentCampaigns }
                    loading={ loading }
                />
            </div>

            { dataReady && ! isNew && growth.length > 0 ? (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                    <SubscriberGrowth
                        growth={ growth }
                        className="xl:col-span-3"
                    />
                    <DevicesBrowsers
                        devices={ data.devices ?? [] }
                        browsers={ data.browsers ?? [] }
                        className="xl:col-span-2"
                    />
                </div>
            ) : null }
        </div>
    );
}

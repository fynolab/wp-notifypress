import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import {
    Activity,
    ArrowRight,
    Bell,
    CheckCircle2,
    Clock,
    Globe,
    MapPin,
    Repeat,
    TrendingDown,
    TrendingUp,
    Users,
    XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import { isUnauthorizedError, laravelRequest } from '../lib/api';
import useLiveActivity from '../lib/use-live-activity';
import LiveActivityPanel from '../components/live-activity-panel';
import { formatNumber } from '../lib/format';
import { cn } from '../components/utils';
import { WorldChoropleth } from '../components/world-map/world-choropleth';
import { CountryDetails } from '../components/world-map/country-details';
import { flagFromCode } from '../components/world-map/country-codes';
import type { MapCountry } from '../components/world-map/types';
import type {
    DashboardCampaign,
    DashboardCountry,
    DashboardData,
    LaravelResource,
    NotifyPressSettings,
} from '../types';

const statusConfig: Record<
    string,
    {
        icon: typeof CheckCircle2;
        color: string;
        bg: string;
        label: string;
    }
> = {
    sent: {
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-600/10',
        label: 'Completed',
    },
    sending: {
        icon: Clock,
        color: 'text-blue-500',
        bg: 'bg-blue-500/10',
        label: 'Sending',
    },
    scheduled: {
        icon: Clock,
        color: 'text-amber-500',
        bg: 'bg-amber-500/10',
        label: 'Scheduled',
    },
    recurring: {
        icon: Repeat,
        color: 'text-violet-500',
        bg: 'bg-violet-500/10',
        label: 'Recurring',
    },
    failed: {
        icon: XCircle,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        label: 'Failed',
    },
    pending: {
        icon: Clock,
        color: 'text-gray-500',
        bg: 'bg-gray-500/10',
        label: 'Pending',
    },
};

const countryGradients = [
    'from-blue-500 to-blue-600',
    'from-purple-500 to-purple-600',
    'from-cyan-500 to-cyan-600',
    'from-emerald-500 to-emerald-600',
    'from-amber-500 to-amber-600',
];

const emptyDashboardData: DashboardData = {
    totalNotifications: 0,
    totalSubscribers: 0,
    totalCountries: 0,
    totalScheduledNotifications: 0,
    topCountries: [],
    recentCampaigns: [],
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

function formatRelativeDate( date?: string ) {
    const target = new Date( date || '' ).getTime();

    if ( ! date || Number.isNaN( target ) ) {
        return '';
    }

    const diffMs = target - Date.now();
    const diffMinutes = Math.round( diffMs / 60000 );
    const formatter = new Intl.RelativeTimeFormat( 'en', { numeric: 'auto' } );

    if ( Math.abs( diffMinutes ) < 60 ) {
        return formatter.format( diffMinutes, 'minute' );
    }

    const diffHours = Math.round( diffMinutes / 60 );

    if ( Math.abs( diffHours ) < 24 ) {
        return formatter.format( diffHours, 'hour' );
    }

    const diffDays = Math.round( diffHours / 24 );

    return formatter.format( diffDays, 'day' );
}

function compact( value?: string | number | null ) {
    return formatNumber( value );
}

function toNumber( value?: string | number | null ) {
    const number = Number( String( value ?? 0 ).replace( /,/g, '' ) );

    return Number.isFinite( number ) ? number : 0;
}

function useAnimatedNumber( target: number, duration = 700 ) {
    const previous = useRef( target );
    const [ display, setDisplay ] = useState( target );

    useEffect( () => {
        const from = previous.current;
        const delta = target - from;
        let frame = 0;

        previous.current = target;

        if ( delta === 0 ) {
            setDisplay( target );
            return undefined;
        }

        const start = performance.now();

        const tick = ( now: number ) => {
            const progress = Math.min( ( now - start ) / duration, 1 );
            const eased = 1 - Math.pow( 1 - progress, 3 );

            setDisplay( from + delta * eased );

            if ( progress < 1 ) {
                frame = requestAnimationFrame( tick );
            }
        };

        frame = requestAnimationFrame( tick );

        return () => cancelAnimationFrame( frame );
    }, [ duration, target ] );

    return display;
}

function AnimatedCompact( {
    value,
    decimals = 0,
    suffix = '',
}: {
    value?: string | number | null;
    decimals?: number;
    suffix?: string;
} ) {
    const animated = useAnimatedNumber( toNumber( value ) );

    if ( suffix ) {
        return (
            <>
                { animated.toFixed( decimals ) }
                { suffix }
            </>
        );
    }

    return <>{ compact( Math.round( animated ) ) }</>;
}

function StatCards( {
    data,
    dataReady,
    loading,
}: {
    data?: DashboardData;
    dataReady: boolean;
    loading: boolean;
} ) {
    const stats = [
        {
            title: 'Notifications Sent',
            value: data?.totalNotifications,
            change: dataReady ? '+8.2%' : '0%',
            icon: Bell,
            color: 'text-purple-500',
        },
        {
            title: 'Total Subscribers',
            value: data?.totalSubscribers,
            change: dataReady ? '+12.5%' : '0%',
            icon: Users,
            color: 'text-blue-500',
        },
        {
            title: 'Click Rate',
            value: dataReady ? 18.4 : 0,
            change: dataReady ? '+2.1%' : '0%',
            icon: TrendingUp,
            color: 'text-emerald-600',
            decimals: 1,
            suffix: '%',
        },
        {
            title: 'Total Scheduled Notifications',
            value: data?.totalScheduledNotifications,
            change: dataReady ? '+5' : '0',
            icon: Activity,
            color: 'text-cyan-500',
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            { stats.map( ( stat ) => {
                const Icon = stat.icon;

                return (
                    <Card
                        key={ stat.title }
                        className={ `bg-card border-border transition-opacity duration-500 ${
                            loading ? 'animate-pulse opacity-70' : 'opacity-100'
                        }` }
                    >
                        <div className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                        { stat.title }
                                    </p>
                                    <p className="text-3xl font-bold text-foreground">
                                        <AnimatedCompact
                                            value={ stat.value }
                                            decimals={ stat.decimals }
                                            suffix={ stat.suffix }
                                        />
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm font-medium text-emerald-600">
                                            { stat.change }
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            vs last month
                                        </span>
                                    </div>
                                </div>
                                <div
                                    className={ `p-3 rounded-lg bg-secondary ${ stat.color }` }
                                >
                                    <Icon className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    </Card>
                );
            } ) }
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
    const isEmpty = dataReady && audience === 0;
    const unknownShare =
        audience > 0 ? Math.round( ( withoutCountry / audience ) * 100 ) : 0;
    const countryCount = Number( totalCountries || 0 );

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
            <div className="mb-6 flex items-start justify-between gap-3">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Globe className="w-5 h-5 text-primary" />
                        Top Countries
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        { dataReady && ! isEmpty
                            ? `Subscribers in ${ countryCount } ${
                                  countryCount === 1 ? 'country' : 'countries'
                              }`
                            : 'Geographic distribution of subscribers' }
                    </p>
                </div>
                <div className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
                    <span className="text-sm font-semibold tabular-nums text-primary">
                        <AnimatedCompact value={ totalSubscribers } /> Total
                    </span>
                </div>
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
                    <div
                        className={ `grid grid-cols-1 gap-3 transition-opacity duration-500 ${
                            dataReady ? 'opacity-100' : 'opacity-80'
                        }` }
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
                                const gradient =
                                    countryGradients[
                                        index % countryGradients.length
                                    ];

                                return (
                                    <button
                                        key={ code || country.name || index }
                                        type="button"
                                        disabled={ ! code }
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
                                            'group relative overflow-hidden rounded-lg border border-border bg-card text-left transition-all duration-300 hover:bg-accent/5 hover:shadow-lg enabled:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                            code && code === hoveredCode
                                                ? 'bg-accent/5 shadow-lg ring-1 ring-primary/40'
                                                : null
                                        ) }
                                    >
                                        <div
                                            className={ `absolute inset-0 bg-gradient-to-r ${ gradient } opacity-0 transition-opacity duration-300 group-hover:opacity-5` }
                                        />

                                        <div className="relative flex items-center justify-between gap-3 p-3 sm:p-4">
                                            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-xl sm:h-12 sm:w-12 sm:text-2xl">
                                                    { country.flag ||
                                                        flagFromCode( code ) }
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                                        <h4 className="max-w-full truncate font-semibold text-foreground">
                                                            { country.name ||
                                                                country.country ||
                                                                'Unknown' }
                                                        </h4>
                                                        <span
                                                            className={ cn(
                                                                'flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                                                                growthUp
                                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                                    : 'bg-red-500/10 text-red-600 dark:text-red-400'
                                                            ) }
                                                            title="New subscribers last month vs the month before"
                                                        >
                                                            { growthUp ? (
                                                                <TrendingUp className="h-3 w-3" />
                                                            ) : (
                                                                <TrendingDown className="h-3 w-3" />
                                                            ) }
                                                            { growthUp
                                                                ? '+'
                                                                : '' }
                                                            { growth }%
                                                        </span>
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">
                                                        { formatNumber(
                                                            country.subscribers
                                                        ) }{ ' ' }
                                                        subscribers
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                                <div className="text-xl font-bold text-foreground sm:text-2xl">
                                                    { percentage }%
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    of total
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-1 bg-secondary">
                                            <div
                                                className={ `h-full bg-gradient-to-r ${ gradient } transition-all duration-500` }
                                                style={ {
                                                    width: `${ percentage }%`,
                                                } }
                                            />
                                        </div>
                                    </button>
                                );
                            } )
                        ) : (
                            <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                                No country breakdown available yet.
                            </div>
                        ) }
                    </div>
                ) }
            </div>
        </Card>
    );
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

    return (
        <Card
            className={ cn(
                'p-6 bg-card border-border transition-opacity duration-500',
                loading ? 'opacity-75' : 'opacity-100',
                className
            ) }
        >
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">
                        Recent Campaigns
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Latest notification campaigns
                    </p>
                </div>
                <Link
                    to="/notifications"
                    className="inline-flex h-8 items-center justify-center rounded-md px-3 text-xs font-medium text-primary transition-colors hover:bg-accent hover:text-primary"
                >
                    View All
                    <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
            </div>

            <div className="space-y-4">
                { rows.length ? (
                    rows.map( ( campaign ) => {
                        const status =
                            statusConfig[
                                ( campaign.status ||
                                    'pending' ) as keyof typeof statusConfig
                            ] || statusConfig.pending;
                        const StatusIcon = status.icon;
                        const displayDate = String(
                            campaign.date ||
                                campaign.sent_at ||
                                campaign.scheduled_at ||
                                campaign.created_at ||
                                ''
                        );
                        const analytics =
                            typeof campaign.analytics === 'object' &&
                            campaign.analytics
                                ? campaign.analytics
                                : {};

                        return (
                            <div
                                key={ campaign.id }
                                className="flex items-start gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-accent/50"
                            >
                                <div
                                    className={ `rounded-lg p-2 ${ status.bg }` }
                                >
                                    <StatusIcon
                                        className={ `h-5 w-5 ${ status.color }` }
                                    />
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="mb-2 flex items-start justify-between gap-2">
                                        <h4 className="text-sm font-medium text-foreground">
                                            { campaign.title ||
                                                'Untitled campaign' }
                                        </h4>
                                        <Badge
                                            variant="outline"
                                            className={ `text-xs border-transparent ${ status.bg } ${ status.color }` }
                                        >
                                            { status.label }
                                        </Badge>
                                    </div>

                                    <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 whitespace-nowrap text-xs text-muted-foreground">
                                        <span>
                                            { formatRelativeDate(
                                                displayDate
                                            ) }
                                        </span>
                                        { campaign.status === 'sent' && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    { formatNumber(
                                                        analytics.views ?? 0
                                                    ) }{ ' ' }
                                                    views
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    { formatNumber(
                                                        analytics.clicks ?? 0
                                                    ) }{ ' ' }
                                                    clicks
                                                </span>
                                                <span>•</span>
                                                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                                    { analytics.click_through_rate ??
                                                        0 }
                                                    % CTR
                                                </span>
                                            </>
                                        ) }
                                        { campaign.status === 'sending' && (
                                            <>
                                                <span>•</span>
                                                <span>
                                                    Delivery in progress
                                                </span>
                                            </>
                                        ) }
                                    </div>
                                </div>
                            </div>
                        );
                    } )
                ) : (
                    <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                        No recent campaigns yet.
                    </div>
                ) }
            </div>
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

    const data = dashboardQuery.data?.data ?? emptyDashboardData;
    const dataReady = Boolean( dashboardQuery.data?.data );
    const loading = dashboardQuery.isFetching && ! dataReady;

    return (
        <div className="container mx-auto space-y-8 px-4 py-8">
            <StatCards
                data={ data }
                dataReady={ dataReady }
                loading={ loading }
            />

            { liveSends.length > 0 ? (
                <LiveActivityPanel
                    sends={ liveSends }
                    onMarkCancelling={ markCancelling }
                />
            ) : null }

            { /* The map gets the wider column (3/5) on large screens; between lg and
                xl the two cards stay half and half so Recent Campaigns keeps room. */ }
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                <TopCountriesMap
                    className="xl:col-span-3"
                    countries={ data?.topCountries }
                    mapCountries={ data?.mapCountries }
                    subscribersWithoutCountry={
                        data?.subscribersWithoutCountry
                    }
                    settings={ settingsQuery.data }
                    dataReady={ dataReady }
                    loading={ loading }
                    totalCountries={ data?.totalCountries }
                    totalSubscribers={ data?.totalSubscribers }
                />
                <RecentCampaigns
                    className="xl:col-span-2"
                    campaigns={ data?.recentCampaigns }
                    loading={ loading }
                />
            </div>
        </div>
    );
}

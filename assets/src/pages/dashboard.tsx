import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from '@wordpress/element';
import {
    Activity,
    ArrowRight,
    Bell,
    CheckCircle2,
    Clock,
    Globe,
    MapPin,
    Repeat,
    TrendingUp,
    Users,
    XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Badge } from '../components/ui/badge';
import { Card } from '../components/ui/card';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import { laravelRequest } from '../lib/api';
import useLiveActivity from '../lib/use-live-activity';
import LiveActivityPanel from '../components/live-activity-panel';
import { formatNumber } from '../lib/format';
import type {
    DashboardCampaign,
    DashboardCountry,
    DashboardData,
    LaravelResource,
} from '../types';

const worldMapImage = new URL(
    '../images/world-map-dark-theme-with-glowing-blue-points.jpg',
    import.meta.url
).href;

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
        const start = performance.now();
        const delta = target - from;
        let frame = 0;

        previous.current = target;

        if ( delta === 0 ) {
            setDisplay( target );
            return undefined;
        }

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
    totalCountries,
    totalSubscribers,
    dataReady,
    loading,
}: {
    countries?: DashboardCountry[];
    totalCountries?: string | number;
    totalSubscribers?: string | number;
    dataReady: boolean;
    loading: boolean;
} ) {
    const rows = countries || [];

    return (
        <Card
            className={ `p-6 bg-card border-border overflow-hidden relative transition-opacity duration-500 ${
                loading ? 'opacity-75' : 'opacity-100'
            }` }
        >
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                        <Globe className="w-5 h-5 text-primary" />
                        Top Countries
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Geographic distribution of subscribers
                    </p>
                </div>
                <div className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5">
                    <span className="text-sm font-semibold tabular-nums text-primary">
                        <AnimatedCompact value={ totalSubscribers } /> Total
                    </span>
                </div>
            </div>

            <div className="relative mb-6 h-72 overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
                <img
                    src={ worldMapImage }
                    alt="World Map"
                    className="h-full w-full object-cover opacity-40 mix-blend-luminosity"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

                <div className="absolute inset-0 flex items-center justify-center">
                    <div
                        className={ `space-y-3 rounded-2xl border border-border/50 bg-card/30 px-8 py-6 text-center backdrop-blur-sm transition-opacity duration-500 ${
                            loading ? 'animate-pulse opacity-80' : 'opacity-100'
                        }` }
                    >
                        <div className="flex items-center justify-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <p className="text-sm font-medium text-muted-foreground">
                                Active in
                            </p>
                        </div>
                        <p className="text-5xl font-bold text-foreground">
                            <AnimatedCompact value={ totalCountries } />
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Countries Worldwide
                        </p>
                    </div>
                </div>

                <div className="absolute right-4 top-4 h-24 w-24 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute bottom-4 left-4 h-32 w-32 rounded-full bg-accent/20 blur-3xl" />
            </div>

            <div
                className={ `grid grid-cols-1 gap-3 transition-opacity duration-500 ${
                    dataReady ? 'opacity-100' : 'opacity-80'
                }` }
            >
                { rows.length ? (
                    rows.map( ( country, index ) => {
                        const percentage = Number( country.percentage || 0 );
                        const gradient =
                            countryGradients[ index % countryGradients.length ];

                        return (
                            <div
                                key={ country.name || country.country || index }
                                className="group relative overflow-hidden rounded-lg border border-border bg-card transition-all duration-300 hover:scale-[1.02] hover:bg-accent/5 hover:shadow-lg"
                            >
                                <div
                                    className={ `absolute inset-0 bg-gradient-to-r ${ gradient } opacity-0 transition-opacity duration-300 group-hover:opacity-5` }
                                />

                                <div className="relative flex items-center justify-between p-4">
                                    <div className="flex flex-1 items-center gap-4">
                                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-2xl">
                                            { country.flag || '🌐' }
                                        </div>
                                        <div className="flex-1">
                                            <div className="mb-1 flex items-center gap-2">
                                                <h4 className="font-semibold text-foreground">
                                                    { country.name ||
                                                        country.country ||
                                                        'Unknown' }
                                                </h4>
                                                { country.growth ? (
                                                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                                        <TrendingUp className="h-3 w-3" />
                                                        { country.growth }
                                                    </span>
                                                ) : null }
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-muted-foreground">
                                                    { formatNumber(
                                                        country.subscribers
                                                    ) }{ ' ' }
                                                    subscribers
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-foreground">
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
                                        style={ { width: `${ percentage }%` } }
                                    />
                                </div>
                            </div>
                        );
                    } )
                ) : (
                    <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                        No country breakdown available yet.
                    </div>
                ) }
            </div>
        </Card>
    );
}

function RecentCampaigns( {
    campaigns,
    loading,
}: {
    campaigns?: DashboardCampaign[];
    loading: boolean;
} ) {
    const rows = campaigns || [];

    return (
        <Card
            className={ `p-6 bg-card border-border transition-opacity duration-500 ${
                loading ? 'opacity-75' : 'opacity-100'
            }` }
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

                                    <div className="mb-2 flex items-center gap-4 text-xs text-muted-foreground">
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
                                                <span className="font-medium text-emerald-600">
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
    const { dashboardQuery } = useDashboardData();
    const { liveSends, markCancelling } = useLiveActivity();

    if ( dashboardQuery.isError ) {
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

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <TopCountriesMap
                    countries={ data?.topCountries }
                    dataReady={ dataReady }
                    loading={ loading }
                    totalCountries={ data?.totalCountries }
                    totalSubscribers={ data?.totalSubscribers }
                />
                <RecentCampaigns
                    campaigns={ data?.recentCampaigns }
                    loading={ loading }
                />
            </div>
        </div>
    );
}

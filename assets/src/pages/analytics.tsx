import { useQuery } from '@tanstack/react-query';
import { useState } from '@wordpress/element';
import { Card, CardContent } from '../components/ui/card';
import { cn } from '../components/utils';
import { AnalyticsKpis } from '../components/analytics/analytics-kpis';
import { AnalyticsInsight } from '../components/analytics/analytics-insight';
import { EngagementCard } from '../components/analytics/engagement-card';
import { FunnelCard } from '../components/analytics/funnel-card';
import { BestTimesCard } from '../components/analytics/best-times-card';
import { CountriesCard } from '../components/analytics/countries-card';
import { LossReasonsCard } from '../components/analytics/loss-reasons-card';
import { SegmentsCard } from '../components/analytics/segments-card';
import { CampaignTable } from '../components/analytics/campaign-table';
import { AnalyticsSkeleton } from '../components/analytics/analytics-skeleton';
import { AudienceCard } from '../components/analytics/audience-card';
import { LockedSection } from '../components/analytics/locked-section';
import { ANALYTICS_RANGES } from '../components/analytics/constants';
import { DevicesBrowsers } from '../components/dashboard/devices-browsers';
import { isUnauthorizedError, laravelRequest } from '../lib/api';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import type {
    AnalyticsData,
    AnalyticsRange,
    LaravelResource,
    NotifyPressSettings,
} from '../types';

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

function AnalyticsContent( {
    data,
    loading,
    settings,
    token,
}: {
    data: AnalyticsData;
    loading: boolean;
    settings?: NotifyPressSettings;
    token: string;
} ) {
    const { isPaidUser, engagement, funnel, segments, countries, bestTimes } =
        data;
    const audience = data.audience;
    // The server sends a full period for the range it answered, so the chart
    // sections use that range rather than the button that was just pressed.
    const shownRange = data.range;

    return (
        <div
            aria-busy={ loading }
            className={ cn(
                'space-y-6 transition-opacity duration-300',
                loading ? 'opacity-70' : 'opacity-100'
            ) }
        >
            { /* The whole page is a paid feature. The API still sends the
                summary to Free users for older plugin copies, so it is
                hidden here and shown as a placeholder in LockedSection. */ }
            { isPaidUser ? (
                <>
                    <AnalyticsInsight
                        range={ shownRange }
                        summary={ data.summary }
                        bestTimes={ bestTimes }
                        countries={ countries }
                    />

                    <AnalyticsKpis
                        summary={ data.summary }
                        engagement={ engagement }
                        range={ shownRange }
                    />
                </>
            ) : null }

            { isPaidUser &&
            engagement &&
            funnel &&
            segments &&
            countries &&
            bestTimes &&
            audience ? (
                <>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <EngagementCard
                            className="xl:col-span-3"
                            engagement={ engagement }
                            summary={ data.summary }
                            range={ shownRange }
                            granularity={ data.period.granularity }
                        />
                        <FunnelCard
                            className="xl:col-span-2"
                            funnel={ funnel }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <BestTimesCard
                            className="xl:col-span-3"
                            bestTimes={ bestTimes }
                        />
                        <CountriesCard
                            className="xl:col-span-2"
                            countries={ countries }
                            range={ shownRange }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <AudienceCard
                            className="xl:col-span-3"
                            audience={ audience }
                            range={ shownRange }
                            granularity={ data.period.granularity }
                        />
                        <LossReasonsCard
                            className="xl:col-span-2"
                            audience={ audience }
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <SegmentsCard
                            className="xl:col-span-3"
                            segments={ segments }
                        />
                        <DevicesBrowsers
                            className="xl:col-span-2"
                            devices={ data.devices ?? [] }
                            browsers={ data.browsers ?? [] }
                            title="Browsers and devices"
                            description="Share of campaign views"
                            emptyText="No views in this period yet."
                            testId="analytics-devices"
                        />
                    </div>

                    <CampaignTable
                        range={ shownRange }
                        settings={ settings }
                        token={ token }
                    />
                </>
            ) : null }

            { isPaidUser ? null : <LockedSection /> }
        </div>
    );
}

export default function AnalyticsPage() {
    const [ range, setRange ] = useState< AnalyticsRange >( '30d' );
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const settings = settingsQuery.data;
    const token = getApiToken( settings );
    const hasToken = hasApiToken( settings );
    const analyticsQuery = useQuery( {
        queryKey: [ 'np-analytics', token, range ],
        enabled: hasToken,
        // Keep the previous range on screen while the next one loads.
        placeholderData: ( previous ) => previous,
        queryFn: () =>
            laravelRequest< LaravelResource< AnalyticsData > >(
                settings,
                '/analytics',
                { query: { range } }
            ),
    } );

    // A rejected token has no analytics to show, so it reads like a missing one.
    if ( ! hasToken || isUnauthorizedError( analyticsQuery.error ) ) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="border-amber-200 bg-amber-50 text-amber-900">
                    <CardContent className="py-6">
                        <p className="text-sm font-semibold">
                            API token required
                        </p>
                        <p className="mt-1 text-sm text-amber-800">
                            Connect NotifyPress or add an API token in Settings
                            to load analytics for this site.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (
        analyticsQuery.isError &&
        ! isUnauthorizedError( analyticsQuery.error )
    ) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardContent className="py-6">
                        <p className="text-sm font-semibold text-foreground">
                            Analytics unavailable
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            { analyticsQuery.error instanceof Error
                                ? analyticsQuery.error.message
                                : 'Unable to load analytics for this site.' }
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const data = analyticsQuery.data?.data;
    const loading = analyticsQuery.isFetching;
    const siteName = siteNameFor( settings );

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                        Analytics
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        { siteName
                            ? `Campaign engagement and audience for ${ siteName }`
                            : 'Campaign engagement and audience for your site' }
                    </p>
                </div>
                <div
                    role="group"
                    aria-label="Time range"
                    className="flex gap-0.5 rounded-lg bg-muted p-1"
                >
                    { ANALYTICS_RANGES.map( ( option ) => (
                        <button
                            key={ option.key }
                            type="button"
                            aria-pressed={ option.key === range }
                            onClick={ () => setRange( option.key ) }
                            className={ cn(
                                'h-8 min-w-12 rounded-md px-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                option.key === range
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            ) }
                        >
                            { option.label }
                        </button>
                    ) ) }
                </div>
            </header>

            { data ? (
                <AnalyticsContent
                    data={ data }
                    loading={ loading }
                    settings={ settings }
                    token={ token }
                />
            ) : (
                <AnalyticsSkeleton />
            ) }
        </div>
    );
}

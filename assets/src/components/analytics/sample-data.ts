import { toLocalDayKey } from '../../lib/format';

import type {
    AnalyticsAudience,
    AnalyticsBestTimes,
    AnalyticsCountries,
    AnalyticsEngagementBucket,
    AnalyticsFunnel,
    AnalyticsSegmentRow,
    AnalyticsShareRow,
    AnalyticsSummary,
} from '../../types';

/**
 * Made-up figures for the locked Analytics page. Free users never get real data from the
 * server; these only fill the charts under the upgrade overlay so the page shows what a
 * paid plan looks like. Deterministic, so the preview never jumps between renders.
 */

const DAYS = 30;

function isoDay( offsetFromToday: number ): string {
    const date = new Date();
    date.setDate( date.getDate() - offsetFromToday );

    return toLocalDayKey( date );
}

// A smooth, repeatable wave so the bars look like real traffic.
function wave( index: number, base: number, swing: number ): number {
    return Math.round(
        base +
            swing * Math.sin( index / 2.3 ) +
            ( swing / 2 ) * Math.cos( index / 1.1 )
    );
}

function ctr( clicks: number, views: number ): number | null {
    if ( views === 0 ) {
        return null;
    }

    return Math.round( ( clicks / views ) * 1000 ) / 10;
}

const engagement: AnalyticsEngagementBucket[] = Array.from(
    { length: DAYS },
    ( _, index ) => {
        const views = Math.max( 0, wave( index, 420, 160 ) );
        const clicks = Math.max(
            0,
            Math.round( views * ( 0.08 + 0.012 * Math.sin( index / 4 ) ) )
        );

        return {
            date: isoDay( DAYS - 1 - index ),
            campaigns: Math.max( 1, Math.round( 1.6 + Math.sin( index / 4 ) ) ),
            views,
            clicks,
            ctr: ctr( clicks, views ),
        };
    }
);

const totalViews = engagement.reduce( ( sum, row ) => sum + row.views, 0 );
const totalClicks = engagement.reduce( ( sum, row ) => sum + row.clicks, 0 );
const totalCampaigns = engagement.reduce(
    ( sum, row ) => sum + row.campaigns,
    0
);

const summary: AnalyticsSummary = {
    campaigns: { current: totalCampaigns, previous: totalCampaigns - 6 },
    views: { current: totalViews, previous: Math.round( totalViews * 0.82 ) },
    clicks: {
        current: totalClicks,
        previous: Math.round( totalClicks * 0.76 ),
    },
    ctr: {
        current: ctr( totalClicks, totalViews ),
        previous: ctr(
            Math.round( totalClicks * 0.76 ),
            Math.round( totalViews * 0.82 )
        ),
    },
};

const funnel: AnalyticsFunnel = {
    campaigns: totalCampaigns,
    untracked: 0,
    sent: Math.round( totalViews * 1.9 ),
    delivered: Math.round( totalViews * 1.75 ),
    failed: Math.round( totalViews * 0.15 ),
    views: totalViews,
    clicks: totalClicks,
};

// 7 days x 24 hours; busiest on weekday mornings and evenings.
const slotViews: number[] = [];
const slotClicks: number[] = [];

for ( let day = 0; day < 7; day++ ) {
    for ( let hour = 0; hour < 24; hour++ ) {
        const morning = Math.max( 0, 6 - Math.abs( hour - 9 ) );
        const evening = Math.max( 0, 7 - Math.abs( hour - 20 ) );
        const weekday = day < 5 ? 1.2 : 0.8;
        const views = Math.round(
            ( 4 + morning * 9 + evening * 11 ) * weekday
        );

        slotViews.push( views );
        slotClicks.push(
            Math.round( views * ( 0.06 + ( evening > 0 ? 0.04 : 0 ) ) )
        );
    }
}

const bestTimes: AnalyticsBestTimes = {
    from: isoDay( 91 ),
    weeks: 13,
    views: slotViews,
    clicks: slotClicks,
};

const countryRows: [ string, string, string, number, number ][] = [
    [ 'US', 'United States', '🇺🇸', 4120, 392 ],
    [ 'GB', 'United Kingdom', '🇬🇧', 2310, 201 ],
    [ 'DE', 'Germany', '🇩🇪', 1640, 131 ],
    [ 'CA', 'Canada', '🇨🇦', 1180, 109 ],
    [ 'IN', 'India', '🇮🇳', 960, 64 ],
    [ 'AU', 'Australia', '🇦🇺', 720, 70 ],
];

const countries: AnalyticsCountries = {
    from: isoDay( DAYS - 1 ),
    days: DAYS,
    siteCtr: summary.ctr.current,
    rows: countryRows.map( ( [ code, name, flag, views, clicks ] ) => ( {
        code,
        name,
        flag,
        views,
        clicks,
        ctr: ctr( clicks, views ),
    } ) ),
};

const audienceSeries = Array.from( { length: DAYS }, ( _, index ) => ( {
    date: isoDay( DAYS - 1 - index ),
    new: Math.max( 0, wave( index, 46, 18 ) ),
    lost: Math.max( 0, wave( index + 4, 9, 5 ) ),
} ) );

const audienceNew = audienceSeries.reduce( ( sum, row ) => sum + row.new, 0 );
const audienceLost = audienceSeries.reduce( ( sum, row ) => sum + row.lost, 0 );

const audience: AnalyticsAudience = {
    new: audienceNew,
    lost: audienceLost,
    net: audienceNew - audienceLost,
    series: audienceSeries,
    lostReasons: [
        {
            reason: 'unsubscribed',
            label: 'Unsubscribed',
            subscribers: Math.round( audienceLost * 0.55 ),
            percentage: 55,
        },
        {
            reason: 'token_expired',
            label: 'Token expired',
            subscribers: Math.round( audienceLost * 0.3 ),
            percentage: 30,
        },
        {
            reason: 'token_invalid',
            label: 'Token invalid',
            subscribers: Math.round( audienceLost * 0.15 ),
            percentage: 15,
        },
    ],
};

const segments: AnalyticsSegmentRow[] = [
    {
        id: 1,
        name: 'Returning readers',
        campaigns: 12,
        views: 5200,
        clicks: 520,
        ctr: 10,
    },
    {
        id: 2,
        name: 'Mobile visitors',
        campaigns: 9,
        views: 3900,
        clicks: 312,
        ctr: 8,
    },
    { id: 3, name: 'Europe', campaigns: 6, views: 2650, clicks: 186, ctr: 7 },
    {
        id: null,
        name: 'All subscribers',
        campaigns: 14,
        views: 6100,
        clicks: 366,
        ctr: 6,
    },
];

const devices: AnalyticsShareRow[] = [
    { name: 'Desktop', views: Math.round( totalViews * 0.58 ), percentage: 58 },
    { name: 'Mobile', views: Math.round( totalViews * 0.36 ), percentage: 36 },
    { name: 'Tablet', views: Math.round( totalViews * 0.06 ), percentage: 6 },
];

const browsers: AnalyticsShareRow[] = [
    { name: 'Chrome', views: Math.round( totalViews * 0.64 ), percentage: 64 },
    { name: 'Safari', views: Math.round( totalViews * 0.18 ), percentage: 18 },
    { name: 'Firefox', views: Math.round( totalViews * 0.1 ), percentage: 10 },
    { name: 'Edge', views: Math.round( totalViews * 0.08 ), percentage: 8 },
];

export const SAMPLE_CAMPAIGNS: {
    title: string;
    views: number;
    clicks: number;
}[] = [
    { title: 'Weekend sale starts now', views: 1840, clicks: 221 },
    { title: 'New arrivals this week', views: 1420, clicks: 128 },
    { title: 'Your weekly digest', views: 1260, clicks: 88 },
    { title: 'Last chance: 20% off', views: 980, clicks: 108 },
];

export const SAMPLE_ANALYTICS = {
    range: '30d' as const,
    granularity: 'day' as const,
    summary,
    engagement,
    funnel,
    bestTimes,
    countries,
    audience,
    segments,
    devices,
    browsers,
    ctr,
};

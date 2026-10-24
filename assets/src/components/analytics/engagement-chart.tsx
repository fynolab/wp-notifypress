import {
    Bar,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatDay, formatMonth } from '../dashboard/format';
import type {
    AnalyticsEngagementBucket,
    AnalyticsGranularity,
} from '../../types';

export const ENGAGEMENT_CHART_HEIGHT = 260;

function EngagementTooltip( {
    active,
    payload,
    granularity,
}: {
    granularity: AnalyticsGranularity;
    active?: boolean;
    payload?: { payload: AnalyticsEngagementBucket }[];
} ) {
    if ( ! active || ! payload || 0 === payload.length ) {
        return null;
    }

    const bucket = payload[ 0 ].payload;

    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
            <p className="mb-1 font-semibold">
                { 'month' === granularity
                    ? formatMonth( bucket.date )
                    : formatDay( bucket.date ) }
            </p>
            <p className="text-muted-foreground">
                { bucket.campaigns.toLocaleString() }{ ' ' }
                { 1 === bucket.campaigns ? 'campaign' : 'campaigns' }
            </p>
            <p className="mt-1 flex items-center gap-2">
                <span
                    className="h-2 w-2 rounded-sm bg-primary/40"
                    aria-hidden
                />
                { bucket.views.toLocaleString() } views
            </p>
            <p className="flex items-center gap-2">
                <span
                    className="h-2 w-2 rounded-sm bg-orange-600 dark:bg-orange-400"
                    aria-hidden
                />
                { bucket.clicks.toLocaleString() } clicks
            </p>
            <p className="text-muted-foreground">
                { null !== bucket.ctr
                    ? `${ bucket.ctr }% click rate`
                    : 'No views' }
            </p>
        </div>
    );
}

/**
 * Views are bars on the left axis, clicks a line on the right axis (clicks are
 * a small fraction of views, so a shared axis would flatten them). Lives in its
 * own chunk so Recharts never delays first paint.
 *
 * @param props             Component props.
 * @param props.data        One entry per day or month, oldest first.
 * @param props.granularity Whether each bucket is a day or a month.
 */
export default function EngagementChart( {
    data,
    granularity,
}: {
    data: AnalyticsEngagementBucket[];
    granularity: AnalyticsGranularity;
} ) {
    return (
        <div className="text-muted-foreground [--np-clicks:#c2570c] dark:[--np-clicks:#fb923c]">
            <ResponsiveContainer
                width="100%"
                height={ ENGAGEMENT_CHART_HEIGHT }
            >
                <ComposedChart
                    data={ data }
                    margin={ { top: 8, right: 0, bottom: 0, left: 0 } }
                >
                    <CartesianGrid
                        vertical={ false }
                        stroke="hsl(var(--border))"
                        strokeDasharray="3 3"
                    />
                    <XAxis
                        dataKey="date"
                        tickFormatter={ ( tick: string ) =>
                            'month' === granularity
                                ? formatMonth( tick, false )
                                : formatDay( tick )
                        }
                        tickLine={ false }
                        axisLine={ false }
                        minTickGap={ 28 }
                        tick={ { fontSize: 11, fill: 'currentColor' } }
                    />
                    <YAxis
                        yAxisId="views"
                        allowDecimals={ false }
                        tickLine={ false }
                        axisLine={ false }
                        width={ 40 }
                        tick={ { fontSize: 11, fill: 'currentColor' } }
                    />
                    <YAxis
                        yAxisId="clicks"
                        orientation="right"
                        allowDecimals={ false }
                        tickLine={ false }
                        axisLine={ false }
                        width={ 40 }
                        tick={ { fontSize: 11, fill: 'var(--np-clicks)' } }
                    />
                    <Tooltip
                        content={
                            <EngagementTooltip granularity={ granularity } />
                        }
                        cursor={ { fill: 'hsl(var(--muted))', opacity: 0.5 } }
                    />
                    <Bar
                        yAxisId="views"
                        dataKey="views"
                        fill="hsl(var(--primary))"
                        fillOpacity={ 0.4 }
                        radius={ [ 3, 3, 0, 0 ] }
                        maxBarSize={ 28 }
                        isAnimationActive={ false }
                    />
                    <Line
                        yAxisId="clicks"
                        type="monotone"
                        dataKey="clicks"
                        stroke="var(--np-clicks)"
                        strokeWidth={ 2 }
                        dot={ false }
                        isAnimationActive={ false }
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

import {
    Area,
    CartesianGrid,
    ComposedChart,
    Line,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { formatDay } from './format';
import type { DashboardGrowthDay } from '../../types';

export const GROWTH_CHART_HEIGHT = 220;

function GrowthTooltip( {
    active,
    payload,
}: {
    active?: boolean;
    payload?: { payload: DashboardGrowthDay }[];
} ) {
    if ( ! active || ! payload || 0 === payload.length ) {
        return null;
    }

    const day = payload[ 0 ].payload;

    return (
        <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
            <p className="mb-1 font-semibold">{ formatDay( day.date ) }</p>
            <p className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-sm bg-primary" aria-hidden />
                { day.new.toLocaleString() } new
            </p>
            <p className="flex items-center gap-2">
                <span
                    className="h-2 w-2 rounded-sm bg-orange-600 dark:bg-orange-400"
                    aria-hidden
                />
                { day.lost.toLocaleString() } lost
            </p>
        </div>
    );
}

/**
 * Recharts lives in this lazily loaded chunk so it never delays the
 * dashboard's first paint.
 *
 * @param props      Component props.
 * @param props.days The days to plot, oldest first.
 */
export default function GrowthChart( {
    days,
}: {
    days: DashboardGrowthDay[];
} ) {
    return (
        <div className="text-muted-foreground [--np-lost:#c2570c] dark:[--np-lost:#fb923c]">
            <ResponsiveContainer width="100%" height={ GROWTH_CHART_HEIGHT }>
                <ComposedChart
                    data={ days }
                    margin={ { top: 8, right: 8, bottom: 0, left: 0 } }
                >
                    <defs>
                        <linearGradient
                            id="np-growth-fill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                        >
                            <stop
                                offset="0%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={ 0.25 }
                            />
                            <stop
                                offset="100%"
                                stopColor="hsl(var(--primary))"
                                stopOpacity={ 0.02 }
                            />
                        </linearGradient>
                    </defs>
                    <CartesianGrid
                        vertical={ false }
                        stroke="hsl(var(--border))"
                        strokeDasharray="3 3"
                    />
                    <XAxis
                        dataKey="date"
                        tickFormatter={ formatDay }
                        tickLine={ false }
                        axisLine={ false }
                        minTickGap={ 28 }
                        tick={ { fontSize: 11, fill: 'currentColor' } }
                    />
                    <YAxis
                        allowDecimals={ false }
                        tickLine={ false }
                        axisLine={ false }
                        width={ 36 }
                        tick={ { fontSize: 11, fill: 'currentColor' } }
                    />
                    <Tooltip
                        content={ <GrowthTooltip /> }
                        cursor={ { stroke: 'hsl(var(--border))' } }
                    />
                    <Area
                        type="monotone"
                        dataKey="new"
                        stroke="hsl(var(--primary))"
                        strokeWidth={ 2 }
                        fill="url(#np-growth-fill)"
                        isAnimationActive={ false }
                    />
                    <Line
                        type="monotone"
                        dataKey="lost"
                        stroke="var(--np-lost)"
                        strokeWidth={ 2 }
                        strokeDasharray="5 4"
                        dot={ false }
                        isAnimationActive={ false }
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

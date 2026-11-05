import { Suspense, lazy, useState } from '@wordpress/element';
import { Card } from '../ui/card';
import { cn } from '../utils';
import { formatCount, formatSigned } from './format';
import type { DashboardGrowthDay } from '../../types';

const GrowthChart = lazy( () => import( './growth-chart' ) );

// Matches GROWTH_CHART_HEIGHT in growth-chart.tsx; kept here so the skeleton
// can size itself without loading the chart chunk.
const CHART_HEIGHT = 220;

const RANGES = [ 7, 30, 90 ] as const;

type Range = ( typeof RANGES )[ number ];

export function SubscriberGrowth( {
    growth,
    className,
}: {
    growth: DashboardGrowthDay[];
    className?: string;
} ) {
    const [ range, setRange ] = useState< Range >( 30 );
    const days = growth.slice( -range );
    const added = days.reduce( ( sum, day ) => sum + day.new, 0 );
    const lost = days.reduce( ( sum, day ) => sum + day.lost, 0 );
    const net = added - lost;

    return (
        <Card
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Subscriber growth
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        New and lost subscribers per day
                    </p>
                </div>
                <div
                    role="group"
                    aria-label="Time range"
                    className="flex gap-0.5 rounded-lg bg-muted p-1"
                >
                    { RANGES.map( ( option ) => (
                        <button
                            key={ option }
                            type="button"
                            aria-pressed={ option === range }
                            onClick={ () => {
                                setRange( option );
                            } }
                            className={ cn(
                                'h-8 min-w-12 rounded-md px-2.5 text-sm font-semibold transition-colors',
                                option === range
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            ) }
                        >
                            { option }d
                        </button>
                    ) ) }
                </div>
            </div>

            <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
                <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                            className="h-2.5 w-2.5 rounded-sm bg-primary"
                            aria-hidden
                        />
                        New
                    </dt>
                    <dd className="text-xl font-semibold text-foreground">
                        +{ formatCount( added ) }
                    </dd>
                </div>
                <div>
                    <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span
                            className="h-2.5 w-2.5 rounded-sm bg-orange-600 dark:bg-orange-400"
                            aria-hidden
                        />
                        Unsubscribed or expired
                    </dt>
                    <dd className="text-xl font-semibold text-foreground">
                        { lost > 0 ? `−${ formatCount( lost ) }` : '0' }
                    </dd>
                </div>
                <div>
                    <dt className="text-xs text-muted-foreground">
                        Net change
                    </dt>
                    <dd
                        className={ cn(
                            'text-xl font-semibold',
                            net > 0
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : null,
                            net < 0
                                ? 'text-orange-700 dark:text-orange-400'
                                : null,
                            0 === net ? 'text-foreground' : null
                        ) }
                    >
                        { formatSigned( net ) }
                    </dd>
                </div>
            </dl>

            <figure
                className="mt-4"
                aria-label={ `Subscriber growth over the last ${ range } days: ${ added.toLocaleString() } new and ${ lost.toLocaleString() } lost.` }
            >
                <Suspense
                    fallback={
                        <div
                            className="animate-pulse rounded-lg bg-muted/60"
                            style={ { height: CHART_HEIGHT } }
                        />
                    }
                >
                    <GrowthChart days={ days } />
                </Suspense>
                <figcaption className="mt-2 text-xs text-muted-foreground">
                    Daily totals in your timezone.
                </figcaption>
            </figure>
        </Card>
    );
}

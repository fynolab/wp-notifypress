import { Suspense, lazy } from '@wordpress/element';
import { Card } from '../ui/card';
import { cn } from '../utils';
import { formatCount, formatSigned } from '../dashboard/format';
import { rangeLabel } from './constants';
import type {
    AnalyticsAudience,
    AnalyticsGranularity,
    AnalyticsRange,
} from '../../types';

const GrowthChart = lazy( () => import( '../dashboard/growth-chart' ) );

// Matches GROWTH_CHART_HEIGHT in growth-chart.tsx.
const CHART_HEIGHT = 220;

export function AudienceCard( {
    audience,
    range,
    granularity,
    className,
}: {
    audience: AnalyticsAudience;
    range: AnalyticsRange;
    granularity: AnalyticsGranularity;
    className?: string;
} ) {
    const { new: added, lost, net } = audience;
    const unit = 'month' === granularity ? 'month' : 'day';

    return (
        <Card
            data-testid="analytics-audience"
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <h2 className="text-lg font-semibold text-foreground">Audience</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
                New and lost subscribers per { unit }
            </p>

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
                aria-label={ `Subscriber growth over the last ${ rangeLabel(
                    range
                ) }: ${ added.toLocaleString() } new and ${ lost.toLocaleString() } lost.` }
            >
                <Suspense
                    fallback={
                        <div
                            className="animate-pulse rounded-lg bg-muted/60"
                            style={ { height: CHART_HEIGHT } }
                        />
                    }
                >
                    <GrowthChart
                        days={ audience.series }
                        granularity={ granularity }
                    />
                </Suspense>
                <figcaption className="mt-2 text-xs text-muted-foreground">
                    { 'month' === granularity ? 'Monthly' : 'Daily' } totals in
                    UTC.
                </figcaption>
            </figure>
        </Card>
    );
}

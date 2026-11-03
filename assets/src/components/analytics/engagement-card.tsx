import { Suspense, lazy } from '@wordpress/element';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../utils';
import { prefetchRoute } from '../../lib/prefetch-nav';
import { formatCount } from '../dashboard/format';
import { rangeLabel } from './constants';
import type {
    AnalyticsEngagementBucket,
    AnalyticsGranularity,
    AnalyticsRange,
    AnalyticsSummary,
} from '../../types';

const EngagementChart = lazy( () => import( './engagement-chart' ) );

// Matches ENGAGEMENT_CHART_HEIGHT in engagement-chart.tsx; kept here so the
// skeleton can size itself without loading the chart chunk.
const CHART_HEIGHT = 260;

export function EngagementCard( {
    engagement,
    summary,
    range,
    granularity,
    className,
}: {
    engagement: AnalyticsEngagementBucket[];
    summary: AnalyticsSummary;
    range: AnalyticsRange;
    granularity: AnalyticsGranularity;
    className?: string;
} ) {
    const isEmpty = 0 === summary.campaigns.current;
    const unit = 'month' === granularity ? 'month' : 'day';
    const adverb = 'month' === granularity ? 'Monthly' : 'Daily';

    return (
        <Card
            data-testid="analytics-engagement"
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <div>
                <h2 className="text-lg font-semibold text-foreground">
                    Engagement
                </h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Views and clicks by send { unit }
                </p>
            </div>

            { isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-14 text-center">
                    <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                        aria-hidden
                    >
                        <BarChart3 className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-foreground">
                        No campaigns sent in the last { rangeLabel( range ) }
                    </p>
                    <p className="max-w-72 text-sm text-muted-foreground">
                        Send a campaign and its views and clicks show up here.
                    </p>
                    <Link
                        to="/notifications/new"
                        onMouseEnter={ () =>
                            prefetchRoute( '/notifications/new' )
                        }
                        onFocus={ () => prefetchRoute( '/notifications/new' ) }
                        className="mt-1 inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:text-primary-foreground"
                    >
                        New campaign
                    </Link>
                </div>
            ) : (
                <>
                    <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-2">
                        <div>
                            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span
                                    className="h-2.5 w-2.5 rounded-sm bg-primary/40"
                                    aria-hidden
                                />
                                Views
                            </dt>
                            <dd className="text-xl font-semibold text-foreground">
                                { formatCount( summary.views.current ) }
                            </dd>
                        </div>
                        <div>
                            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span
                                    className="h-2.5 w-2.5 rounded-sm bg-orange-600 dark:bg-orange-400"
                                    aria-hidden
                                />
                                Clicks
                            </dt>
                            <dd className="text-xl font-semibold text-foreground">
                                { formatCount( summary.clicks.current ) }
                            </dd>
                        </div>
                    </dl>

                    <figure
                        className="mt-4"
                        aria-label={ `Engagement over the last ${ rangeLabel(
                            range
                        ) }: ${ summary.views.current.toLocaleString() } views and ${ summary.clicks.current.toLocaleString() } clicks.` }
                    >
                        <Suspense
                            fallback={
                                <div
                                    className="animate-pulse rounded-lg bg-muted/60"
                                    style={ { height: CHART_HEIGHT } }
                                />
                            }
                        >
                            <EngagementChart
                                data={ engagement }
                                granularity={ granularity }
                            />
                        </Suspense>
                        <figcaption className="mt-2 text-xs text-muted-foreground">
                            { adverb } totals in UTC. Views are on the left
                            axis, clicks on the right.
                        </figcaption>
                    </figure>
                </>
            ) }
        </Card>
    );
}

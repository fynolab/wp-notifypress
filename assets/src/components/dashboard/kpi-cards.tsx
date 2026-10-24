import { Link } from 'react-router-dom';
import { ArrowRight, CalendarClock, Repeat } from 'lucide-react';
import { cn } from '../utils';
import { prefetchRoute } from '../../lib/prefetch-nav';
import {
    BigNumber,
    CardFooter,
    CardLabel,
    CardShell,
    DeltaChip,
    Sparkline,
    toneFor,
} from './kpi-primitives';
import { formatCount, formatDateTime, formatSigned } from './format';
import type {
    DashboardCampaignsSent,
    DashboardGrowthDay,
    DashboardPlanUsage,
    DashboardRecentClickRate,
    DashboardSubscriberChange,
    DashboardUpcoming,
} from '../../types';

export function SubscribersCard( {
    active,
    change,
    plan,
    growth,
}: {
    active: number;
    change: DashboardSubscriberChange;
    plan: DashboardPlanUsage;
    growth: DashboardGrowthDay[];
} ) {
    // Walk back from today's count through each day's net change.
    const last30 = growth.slice( -30 );
    const series: number[] = [];
    let running = active;

    for ( let index = last30.length - 1; index >= 0; index-- ) {
        series.unshift( running );
        running -= last30[ index ].new - last30[ index ].lost;
    }

    const usage =
        plan.subscriberLimit > 0
            ? ( plan.accountSubscribers / plan.subscriberLimit ) * 100
            : 0;
    const nearLimit = usage >= 90;
    let percentLabel = '';

    if ( null !== change.percent ) {
        percentLabel = `${ change.percent > 0 ? '+' : '' }${
            change.percent
        }% `;
    }

    return (
        <CardShell label="Subscribers">
            <CardLabel title="Subscribers" />
            <BigNumber>{ formatCount( active ) }</BigNumber>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <DeltaChip tone={ toneFor( change.net ) }>
                    { formatSigned( change.net ) }
                </DeltaChip>
                <span>{ percentLabel }in 30 days</span>
            </p>
            <Sparkline values={ series } />
            <CardFooter>
                <div className="flex items-center justify-between gap-2">
                    <span>{ plan.name } plan</span>
                    <span
                        className={ cn(
                            'font-semibold',
                            nearLimit
                                ? 'text-amber-700 dark:text-amber-400'
                                : 'text-foreground'
                        ) }
                    >
                        { plan.accountSubscribers.toLocaleString() } of{ ' ' }
                        { plan.subscriberLimit.toLocaleString() }
                    </span>
                </div>
                <div
                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-label="Subscribers used on your plan, across all sites"
                    aria-valuemin={ 0 }
                    aria-valuemax={ plan.subscriberLimit }
                    aria-valuenow={ Math.min(
                        plan.accountSubscribers,
                        plan.subscriberLimit
                    ) }
                >
                    <div
                        className={ cn(
                            'h-full rounded-full',
                            nearLimit ? 'bg-amber-500' : 'bg-primary'
                        ) }
                        style={ { width: `${ Math.min( 100, usage ) }%` } }
                    />
                </div>
            </CardFooter>
        </CardShell>
    );
}

export function CampaignsSentCard( {
    sent,
}: {
    sent: DashboardCampaignsSent;
} ) {
    const change = sent.last30 - sent.previous30;
    const tallest = Math.max( 1, ...sent.weekly );

    return (
        <CardShell label="Campaigns sent in the last 30 days">
            <CardLabel title="Campaigns sent" hint="30 days" />
            <BigNumber>{ formatCount( sent.last30 ) }</BigNumber>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <DeltaChip tone="neutral">
                    { 0 === change ? 'No change' : formatSigned( change ) }
                </DeltaChip>
                <span>vs previous 30 days</span>
            </p>
            <div className="flex h-9 items-end gap-1" aria-hidden>
                { sent.weekly.map( ( count, index ) => (
                    <div
                        key={ index }
                        className={ cn(
                            'flex-1 rounded-t-sm',
                            0 === count ? 'bg-muted' : null,
                            count > 0 && index >= sent.weekly.length - 4
                                ? 'bg-primary'
                                : null,
                            count > 0 && index < sent.weekly.length - 4
                                ? 'bg-primary/30'
                                : null
                        ) }
                        style={ {
                            height: `${ Math.max(
                                count > 0 ? 12 : 4,
                                ( count / tallest ) * 100
                            ) }%`,
                        } }
                    />
                ) ) }
            </div>
            <CardFooter>Weekly sends, last 8 weeks</CardFooter>
        </CardShell>
    );
}

export function ClickRateCard( {
    recent,
    allTime,
    change,
    weekly,
}: {
    recent: DashboardRecentClickRate;
    allTime: number;
    change: number | null;
    weekly: ( number | null )[];
} ) {
    const hasRecent = null !== recent.rate;
    const points = weekly.filter( ( rate ): rate is number => null !== rate );
    let changeLabel = '';

    if ( null !== change ) {
        let sign = '';

        if ( change > 0 ) {
            sign = '+';
        } else if ( change < 0 ) {
            sign = '−';
        }

        changeLabel = `${ sign }${ Math.abs( change ) } pts`;
    }

    return (
        <CardShell label="Click rate">
            <CardLabel
                title="Click rate"
                hint={ hasRecent ? '30 days' : 'All time' }
            />
            <BigNumber>{ hasRecent ? recent.rate : allTime }%</BigNumber>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                { null !== change ? (
                    <>
                        <DeltaChip tone={ toneFor( change ) }>
                            { changeLabel }
                        </DeltaChip>
                        <span>vs previous 30 days</span>
                    </>
                ) : (
                    <span>Across your sent campaigns</span>
                ) }
            </p>
            <Sparkline values={ points } />
            <CardFooter>
                { hasRecent
                    ? `${ recent.clicks.toLocaleString() } clicks from ${ recent.views.toLocaleString() } views`
                    : 'No views in the last 30 days' }
            </CardFooter>
        </CardShell>
    );
}

export function UpcomingCard( { upcoming }: { upcoming: DashboardUpcoming } ) {
    const next = upcoming.next;

    return (
        <CardShell label="Upcoming campaigns">
            <CardLabel title="Upcoming" />
            <p className="flex items-baseline gap-2">
                <span className="text-2xl font-semibold leading-none tracking-tight text-foreground sm:text-3xl">
                    { upcoming.scheduled }
                </span>
                <span className="text-sm text-muted-foreground">
                    scheduled
                    { upcoming.recurring > 0
                        ? ` · ${ upcoming.recurring } recurring`
                        : '' }
                </span>
            </p>
            { next ? (
                <div className="flex items-start gap-2.5 rounded-lg bg-muted/60 p-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        { 'recurring' === next.type ? (
                            <Repeat className="h-4 w-4" aria-hidden />
                        ) : (
                            <CalendarClock className="h-4 w-4" aria-hidden />
                        ) }
                    </span>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                            { next.title }
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Next up · { formatDateTime( next.date ) }
                        </p>
                    </div>
                </div>
            ) : (
                <p className="rounded-lg bg-muted/60 p-2.5 text-sm text-muted-foreground">
                    Nothing scheduled yet.
                </p>
            ) }
            <CardFooter>
                <Link
                    to="/notifications"
                    onMouseEnter={ () => prefetchRoute( '/notifications' ) }
                    onFocus={ () => prefetchRoute( '/notifications' ) }
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                >
                    View campaigns
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            </CardFooter>
        </CardShell>
    );
}

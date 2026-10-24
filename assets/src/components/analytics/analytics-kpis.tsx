import {
    BigNumber,
    CardFooter,
    CardLabel,
    CardShell,
    DeltaChip,
    Sparkline,
    toneFor,
} from '../dashboard/kpi-primitives';
import { formatCount } from '../dashboard/format';
import { rangeLabel } from './constants';
import type {
    AnalyticsEngagementBucket,
    AnalyticsRange,
    AnalyticsSummary,
} from '../../types';

function signPrefix( value: number ): string {
    if ( value > 0 ) {
        return '+';
    }

    return value < 0 ? '−' : '';
}

function percentChange( current: number, previous: number ): string | null {
    if ( 0 === previous ) {
        return null;
    }

    const percent = Math.round( ( ( current - previous ) / previous ) * 100 );

    return `${ signPrefix( percent ) }${ Math.abs( percent ) }%`;
}

function KpiCard( {
    title,
    value,
    chip,
    tone,
    range,
    series,
}: {
    title: string;
    value: string;
    chip: string | null;
    tone: number | null;
    range: AnalyticsRange;
    series: number[] | null;
} ) {
    return (
        <CardShell label={ title }>
            <CardLabel title={ title } />
            <BigNumber>{ value }</BigNumber>
            <p className="flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                { null !== chip ? (
                    <DeltaChip tone={ toneFor( tone ) }>{ chip }</DeltaChip>
                ) : (
                    <span>No prior data</span>
                ) }
            </p>
            { null !== series ? <Sparkline values={ series } /> : null }
            <CardFooter>vs previous { rangeLabel( range ) }</CardFooter>
        </CardShell>
    );
}

export function AnalyticsKpis( {
    summary,
    engagement,
    range,
}: {
    summary: AnalyticsSummary;
    engagement: AnalyticsEngagementBucket[] | null;
    range: AnalyticsRange;
} ) {
    const { campaigns, views, clicks, ctr } = summary;
    const ctrDelta =
        null !== ctr.current && null !== ctr.previous
            ? Math.round( ( ctr.current - ctr.previous ) * 10 ) / 10
            : null;
    const ctrSeries =
        null === engagement
            ? null
            : engagement
                  .map( ( bucket ) => bucket.ctr )
                  .filter( ( rate ): rate is number => null !== rate );

    return (
        <div
            data-testid="analytics-kpis"
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
            <KpiCard
                title="Campaigns sent"
                value={ formatCount( campaigns.current ) }
                chip={ percentChange( campaigns.current, campaigns.previous ) }
                tone={ campaigns.current - campaigns.previous }
                range={ range }
                series={
                    engagement?.map( ( bucket ) => bucket.campaigns ) ?? null
                }
            />
            <KpiCard
                title="Views"
                value={ formatCount( views.current ) }
                chip={ percentChange( views.current, views.previous ) }
                tone={ views.current - views.previous }
                range={ range }
                series={ engagement?.map( ( bucket ) => bucket.views ) ?? null }
            />
            <KpiCard
                title="Clicks"
                value={ formatCount( clicks.current ) }
                chip={ percentChange( clicks.current, clicks.previous ) }
                tone={ clicks.current - clicks.previous }
                range={ range }
                series={
                    engagement?.map( ( bucket ) => bucket.clicks ) ?? null
                }
            />
            <KpiCard
                title="Click rate"
                value={ null !== ctr.current ? `${ ctr.current }%` : '–' }
                chip={
                    null !== ctrDelta
                        ? `${ signPrefix( ctrDelta ) }${ Math.abs(
                              ctrDelta
                          ) } pts`
                        : null
                }
                tone={ ctrDelta }
                range={ range }
                series={ ctrSeries }
            />
        </div>
    );
}

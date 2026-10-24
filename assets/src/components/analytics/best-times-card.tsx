import { Fragment } from 'react';
import { useMemo, useState } from '@wordpress/element';
import { Clock } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../utils';
import type { AnalyticsBestTimes } from '../../types';

type Metric = 'clicks' | 'rate';

// Slots with fewer views than this are too noisy to rank by click rate.
const MIN_VIEWS_FOR_RATE = 20;

const DAYS = [ 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun' ];

function hourShort( hour: number ): string {
    const suffix = hour < 12 ? 'a' : 'p';

    return `${ hour % 12 === 0 ? 12 : hour % 12 }${ suffix }`;
}

function hourLong( hour: number ): string {
    const suffix = hour < 12 ? 'AM' : 'PM';

    return `${ hour % 12 === 0 ? 12 : hour % 12 } ${ suffix }`;
}

function pad( hour: number ): string {
    return String( hour ).padStart( 2, '0' );
}

export function BestTimesCard( {
    bestTimes,
    className,
}: {
    bestTimes: AnalyticsBestTimes;
    className?: string;
} ) {
    const [ metric, setMetric ] = useState< Metric >( 'clicks' );
    const { views, clicks, weeks } = bestTimes;
    const isEmpty =
        views.every( ( value ) => value === 0 ) &&
        clicks.every( ( value ) => value === 0 );

    // One value per slot for the chosen metric, or null when there is nothing
    // trustworthy to show.
    const values = useMemo(
        () =>
            Array.from( { length: 168 }, ( _, slot ): number | null => {
                const slotViews = views[ slot ] ?? 0;
                const slotClicks = clicks[ slot ] ?? 0;

                if ( metric === 'clicks' ) {
                    return slotClicks > 0 ? slotClicks : null;
                }

                if ( slotViews < MIN_VIEWS_FOR_RATE ) {
                    return null;
                }

                return slotClicks / slotViews;
            } ),
        [ views, clicks, metric ]
    );
    const max = Math.max( 0, ...values.map( ( value ) => value ?? 0 ) );
    const top = useMemo(
        () =>
            values
                .map( ( value, slot ) => ( { value, slot } ) )
                .filter( ( entry ) => entry.value !== null && entry.value > 0 )
                .sort(
                    ( a, b ) =>
                        ( b.value ?? 0 ) - ( a.value ?? 0 ) || a.slot - b.slot
                )
                .slice( 0, 3 ),
        [ values ]
    );

    const slotLabel = ( slot: number ): string => {
        const day = DAYS[ Math.floor( slot / 24 ) ];
        const hour = slot % 24;
        const slotViews = views[ slot ] ?? 0;
        const slotClicks = clicks[ slot ] ?? 0;
        const rate =
            slotViews > 0
                ? `${ ( ( slotClicks / slotViews ) * 100 ).toFixed( 1 ) }%`
                : '—';

        return `${ day } ${ pad( hour ) }:00–${ pad(
            ( hour + 1 ) % 24
        ) }:00 · ${ slotClicks.toLocaleString() } ${
            slotClicks === 1 ? 'click' : 'clicks'
        } · ${ rate } CTR`;
    };

    return (
        <Card
            data-testid="analytics-best-times"
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Best time to send
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        When your subscribers click the most
                    </p>
                </div>
                <div
                    role="group"
                    aria-label="Heatmap metric"
                    className="flex gap-0.5 rounded-lg bg-muted p-1"
                >
                    { (
                        [
                            { key: 'clicks', label: 'Clicks' },
                            { key: 'rate', label: 'Click rate' },
                        ] as { key: Metric; label: string }[]
                     ).map( ( option ) => (
                        <button
                            key={ option.key }
                            type="button"
                            aria-pressed={ metric === option.key }
                            onClick={ () => {
                                setMetric( option.key );
                            } }
                            className={ cn(
                                'h-7 rounded-md px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                metric === option.key
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            ) }
                        >
                            { option.label }
                        </button>
                    ) ) }
                </div>
            </div>

            { isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-12 text-center">
                    <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                        aria-hidden
                    >
                        <Clock className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-foreground">
                        Not enough data yet
                    </p>
                    <p className="max-w-80 text-sm text-muted-foreground">
                        We started recording engagement by local time recently;
                        check back in a few days.
                    </p>
                </div>
            ) : (
                <>
                    <div className="mt-4 flex min-h-7 flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            Top slots
                        </span>
                        { top.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                                None with enough views yet.
                            </span>
                        ) : (
                            top.map( ( entry ) => (
                                <span
                                    key={ entry.slot }
                                    title={ slotLabel( entry.slot ) }
                                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                                >
                                    { DAYS[ Math.floor( entry.slot / 24 ) ] }{ ' ' }
                                    { hourLong( entry.slot % 24 ) }
                                </span>
                            ) )
                        ) }
                    </div>

                    <div className="mt-4 overflow-x-auto pb-1">
                        <div
                            role="group"
                            aria-label={ `${
                                'clicks' === metric ? 'Clicks' : 'Click rate'
                            } by weekday and hour in subscriber local time` }
                            className="grid min-w-[560px] gap-[3px]"
                            style={ {
                                gridTemplateColumns:
                                    'auto repeat(24, minmax(0, 1fr))',
                            } }
                        >
                            <div aria-hidden />
                            { Array.from( { length: 24 }, ( _, hour ) => (
                                <div
                                    key={ hour }
                                    aria-hidden
                                    className="text-center text-[10px] leading-4 text-muted-foreground"
                                >
                                    { hour % 3 === 0 ? hourShort( hour ) : '' }
                                </div>
                            ) ) }
                            { DAYS.map( ( day, dayIndex ) => (
                                <Fragment key={ day }>
                                    <div className="pr-2 text-xs leading-6 text-muted-foreground">
                                        { day }
                                    </div>
                                    { Array.from(
                                        { length: 24 },
                                        ( _, hour ) => {
                                            const slot = dayIndex * 24 + hour;
                                            const value = values[ slot ];
                                            const opacity =
                                                value !== null && max > 0
                                                    ? 0.15 +
                                                      0.85 * ( value / max )
                                                    : 0;

                                            return (
                                                <div
                                                    key={ slot }
                                                    role="img"
                                                    aria-label={ slotLabel(
                                                        slot
                                                    ) }
                                                    title={ slotLabel( slot ) }
                                                    className="relative h-6 overflow-hidden rounded-sm bg-muted"
                                                >
                                                    <div
                                                        className="h-full w-full bg-primary"
                                                        style={ { opacity } }
                                                    />
                                                </div>
                                            );
                                        }
                                    ) }
                                </Fragment>
                            ) ) }
                        </div>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                        In your subscribers&apos; local time · last { weeks }{ ' ' }
                        weeks
                        { metric === 'rate'
                            ? ` · Slots with fewer than ${ MIN_VIEWS_FOR_RATE } views are left blank`
                            : '' }
                    </p>
                </>
            ) }
        </Card>
    );
}

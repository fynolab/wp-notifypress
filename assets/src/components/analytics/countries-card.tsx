import { Globe2 } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../utils';
import { formatCount } from '../dashboard/format';
import type { AnalyticsCountries, AnalyticsRange } from '../../types';

export function CountriesCard( {
    countries,
    range,
    className,
}: {
    countries: AnalyticsCountries;
    range: AnalyticsRange;
    className?: string;
} ) {
    const { rows, siteCtr, days } = countries;
    const scale = Math.max(
        1,
        siteCtr ?? 0,
        ...rows.map( ( row ) => row.ctr ?? 0 )
    );

    return (
        <Card
            data-testid="analytics-countries"
            className={ cn(
                'flex flex-col border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <h2 className="text-lg font-semibold text-foreground">
                Engagement by country
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
                Last { days } days
                { siteCtr !== null ? ` · Site CTR ${ siteCtr }%` : '' }
            </p>

            { rows.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-4 py-10 text-center">
                    <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                        aria-hidden
                    >
                        <Globe2 className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-foreground">
                        No country data yet
                    </p>
                    <p className="max-w-64 text-sm text-muted-foreground">
                        Views and clicks by country show up here once campaigns
                        are opened.
                    </p>
                </div>
            ) : (
                <ul className="mt-4 space-y-3.5">
                    { rows.map( ( row ) => (
                        <li key={ row.code }>
                            <div className="flex items-center justify-between gap-3 text-sm">
                                <span className="flex min-w-0 items-center gap-2 font-medium text-foreground">
                                    <span
                                        aria-hidden
                                        className="w-5 shrink-0 text-center"
                                    >
                                        { row.flag ?? '' }
                                    </span>
                                    <span className="truncate">
                                        { row.name }
                                    </span>
                                </span>
                                <span className="shrink-0 text-xs text-muted-foreground">
                                    { formatCount( row.views ) } views ·{ ' ' }
                                    { formatCount( row.clicks ) } clicks ·{ ' ' }
                                    <span className="font-semibold text-foreground">
                                        { row.ctr !== null
                                            ? `${ row.ctr }%`
                                            : '—' }{ ' ' }
                                        CTR
                                    </span>
                                </span>
                            </div>
                            <div
                                className="relative mt-1.5 h-1.5 rounded-full bg-muted"
                                aria-hidden
                            >
                                <div
                                    className="h-full rounded-full bg-primary/70"
                                    style={ {
                                        width: `${ Math.min(
                                            100,
                                            ( ( row.ctr ?? 0 ) / scale ) * 100
                                        ) }%`,
                                    } }
                                />
                                { siteCtr !== null ? (
                                    <div
                                        className="absolute -top-0.5 h-2.5 w-0.5 rounded bg-foreground/70"
                                        style={ {
                                            left: `${ Math.min(
                                                100,
                                                ( siteCtr / scale ) * 100
                                            ) }%`,
                                        } }
                                    />
                                ) : null }
                            </div>
                        </li>
                    ) ) }
                </ul>
            ) }

            <div className="mt-auto space-y-1 pt-4 text-xs text-muted-foreground">
                { siteCtr !== null && rows.length > 0 ? (
                    <p>The vertical marker shows the site average CTR.</p>
                ) : null }
                { range === '12m' ? (
                    <p>Country data covers the last 90 days.</p>
                ) : null }
            </div>
        </Card>
    );
}

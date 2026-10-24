import { Users } from 'lucide-react';
import { Card } from '../ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { cn } from '../utils';
import { formatCount } from '../dashboard/format';
import type { AnalyticsSegmentRow } from '../../types';

export function SegmentsCard( {
    segments,
    className,
}: {
    segments: AnalyticsSegmentRow[];
    className?: string;
} ) {
    const bestRate = Math.max(
        1,
        ...segments.map( ( segment ) => segment.ctr ?? 0 )
    );

    return (
        <Card
            data-testid="analytics-segments"
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <h2 className="text-lg font-semibold text-foreground">
                Segment performance
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
                How each audience responds, top 8 by views
            </p>

            { segments.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-10 text-center">
                    <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                        aria-hidden
                    >
                        <Users className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-foreground">
                        No segment data yet
                    </p>
                    <p className="max-w-64 text-sm text-muted-foreground">
                        Campaign results are grouped by audience here.
                    </p>
                </div>
            ) : (
                <Table className="mt-3">
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead>Segment</TableHead>
                            <TableHead className="text-right">
                                Campaigns
                            </TableHead>
                            <TableHead className="text-right">Views</TableHead>
                            <TableHead className="text-right">Clicks</TableHead>
                            <TableHead className="min-w-28 text-right">
                                CTR
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        { segments.map( ( segment ) => (
                            <TableRow key={ segment.id ?? 'all' }>
                                <TableCell className="font-medium text-foreground">
                                    { segment.id === null
                                        ? 'All subscribers'
                                        : segment.name }
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    { formatCount( segment.campaigns ) }
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    { formatCount( segment.views ) }
                                </TableCell>
                                <TableCell className="text-right tabular-nums">
                                    { formatCount( segment.clicks ) }
                                </TableCell>
                                <TableCell className="text-right">
                                    <span className="font-semibold tabular-nums text-foreground">
                                        { segment.ctr !== null
                                            ? `${ segment.ctr }%`
                                            : '—' }
                                    </span>
                                    <div
                                        className="mt-1 h-1 overflow-hidden rounded-full bg-muted"
                                        aria-hidden
                                    >
                                        <div
                                            className="h-full rounded-full bg-primary"
                                            style={ {
                                                width: `${ Math.min(
                                                    100,
                                                    ( ( segment.ctr ?? 0 ) /
                                                        bestRate ) *
                                                        100
                                                ) }%`,
                                            } }
                                        />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) ) }
                    </TableBody>
                </Table>
            ) }
        </Card>
    );
}

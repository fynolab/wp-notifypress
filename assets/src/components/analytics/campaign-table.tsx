import { useState } from '@wordpress/element';
import { useQuery } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from 'lucide-react';
import { Card } from '../ui/card';
import { buttonVariants } from '../ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import { cn } from '../utils';
import { DeltaChip, toneFor } from '../dashboard/kpi-primitives';
import { formatCount, formatSentAt } from '../dashboard/format';
import { laravelFetch, laravelRequest } from '../../lib/api';
import type {
    AnalyticsCampaignPage,
    AnalyticsCampaignRow,
    AnalyticsCampaignSort,
    AnalyticsRange,
    NotifyPressSettings,
} from '../../types';

const PER_PAGE = 10;
const SKELETON_ROWS = 5;

type Direction = 'asc' | 'desc';

interface Column {
    id: 'title' | AnalyticsCampaignSort;
    title: string;
    align: 'left' | 'right';
}

const COLUMNS: Column[] = [
    { id: 'title', title: 'Campaign', align: 'left' },
    { id: 'sent_at', title: 'Sent at', align: 'left' },
    { id: 'sent', title: 'Sent', align: 'right' },
    { id: 'delivered', title: 'Delivered', align: 'right' },
    { id: 'views', title: 'Views', align: 'right' },
    { id: 'clicks', title: 'Clicks', align: 'right' },
    { id: 'ctr', title: 'CTR', align: 'right' },
];

function formatCell( value: number | null ): string {
    return null === value ? '—' : formatCount( value );
}

function formatDelta( delta: number ): string {
    const rounded = Math.round( delta * 10 ) / 10;

    if ( 0 === rounded ) {
        return '0.0 pp';
    }

    return `${ rounded > 0 ? '+' : '−' }${ Math.abs( rounded ).toFixed(
        1
    ) } pp`;
}

function ariaSortFor(
    sortable: boolean,
    active: boolean,
    direction: Direction
): 'ascending' | 'descending' | 'none' | undefined {
    if ( ! sortable ) {
        return undefined;
    }

    if ( ! active ) {
        return 'none';
    }

    return 'asc' === direction ? 'ascending' : 'descending';
}

/**
 * The download's filename from a Content-Disposition header. The app names the
 * export after the site's domain, which can be non-ASCII: the UTF-8 name then
 * comes in `filename*=` next to an ASCII `filename=`, so prefer the former.
 *
 * @param disposition The Content-Disposition header value.
 */
function filenameFromDisposition( disposition: string ): string {
    const encoded = disposition.match( /filename\*=UTF-8''([^;]+)/i );

    if ( encoded ) {
        try {
            return decodeURIComponent( encoded[ 1 ].trim() );
        } catch ( error ) {
            // Malformed escapes: fall through to the ASCII name.
        }
    }

    const plain = disposition.match( /filename="?([^";]+)"?/i );

    return plain ? plain[ 1 ].trim() : 'campaigns.csv';
}

function downloadBlob( blob: Blob, filename: string ) {
    const objectUrl = window.URL.createObjectURL( blob );
    const link = document.createElement( 'a' );

    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild( link );
    link.click();
    link.remove();

    // Some browsers start a blob download asynchronously: revoking the URL in
    // the same tick can cancel it or produce an empty file.
    window.setTimeout( () => {
        window.URL.revokeObjectURL( objectUrl );
    }, 1000 );
}

function renderCell( column: Column, row: AnalyticsCampaignRow ) {
    switch ( column.id ) {
        case 'title':
            return (
                <div className="min-w-48 max-w-72">
                    <p className="truncate font-medium text-foreground">
                        { row.title }
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        { row.segment ? row.segment.name : 'All subscribers' }
                    </p>
                </div>
            );
        case 'sent_at':
            return (
                <span className="whitespace-nowrap">
                    { formatSentAt( row.sentAt ) }
                </span>
            );
        case 'sent':
            return formatCell( row.sent );
        case 'delivered':
            return formatCell( row.delivered );
        case 'views':
            return formatCount( row.views );
        case 'clicks':
            return formatCount( row.clicks );
        default:
            return (
                <span className="inline-flex items-center justify-end gap-2">
                    <span className="font-semibold text-foreground">
                        { null !== row.ctr ? `${ row.ctr }%` : '—' }
                    </span>
                    { null !== row.ctrDelta ? (
                        <DeltaChip
                            tone={ toneFor( Math.round( row.ctrDelta * 10 ) ) }
                        >
                            { formatDelta( row.ctrDelta ) }
                        </DeltaChip>
                    ) : null }
                </span>
            );
    }
}

export function CampaignTable( {
    range,
    settings,
    token,
    className,
}: {
    range: AnalyticsRange;
    settings?: NotifyPressSettings;
    token: string;
    className?: string;
} ) {
    const [ sort, setSort ] = useState< AnalyticsCampaignSort >( 'sent_at' );
    const [ direction, setDirection ] = useState< Direction >( 'desc' );
    // The page belongs to a range: a different range always starts on page 1.
    const [ pageState, setPageState ] = useState( { range, page: 1 } );
    const [ exporting, setExporting ] = useState( false );
    const [ exportFailed, setExportFailed ] = useState( false );
    const page = pageState.range === range ? pageState.page : 1;

    const query = useQuery( {
        queryKey: [
            'np-analytics-campaigns',
            token,
            range,
            sort,
            direction,
            page,
        ],
        queryFn: () =>
            laravelRequest< AnalyticsCampaignPage >(
                settings,
                '/analytics/campaigns',
                {
                    query: {
                        range,
                        sort,
                        direction,
                        page,
                        per_page: PER_PAGE,
                    },
                }
            ),
        // Keep the current rows on screen while the next page loads.
        placeholderData: ( previous ) => previous,
    } );

    const toggleSort = ( id: AnalyticsCampaignSort ) => {
        if ( id === sort ) {
            setDirection( 'desc' === direction ? 'asc' : 'desc' );
        } else {
            setSort( id );
            setDirection( 'desc' );
        }

        setPageState( { range, page: 1 } );
    };

    const exportCsv = async () => {
        setExporting( true );
        setExportFailed( false );

        try {
            const response = await laravelFetch(
                settings,
                '/analytics/campaigns/export',
                {
                    query: { range },
                    headers: { Accept: 'text/csv, application/json' },
                }
            );

            if ( ! response.ok ) {
                throw new Error( 'Export failed.' );
            }

            const blob = await response.blob();

            downloadBlob(
                blob,
                filenameFromDisposition(
                    response.headers.get( 'content-disposition' ) || ''
                )
            );
        } catch ( error ) {
            setExportFailed( true );
        } finally {
            setExporting( false );
        }
    };

    const result = query.data;
    const rows = result?.data ?? [];
    const meta = result?.meta;
    const lastPage = Math.max( 1, meta?.lastPage ?? 1 );
    const loading = query.isFetching;
    const failed = query.isError && ! result;
    const showSkeleton = ! result && ! failed;
    const isEmpty = !! result && 0 === rows.length;

    return (
        <Card
            data-testid="analytics-campaigns"
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Campaigns
                    </h2>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                        Every campaign sent in this period
                    </p>
                </div>
                <button
                    type="button"
                    disabled={ exporting }
                    onClick={ exportCsv }
                    className={ cn(
                        buttonVariants( { variant: 'outline', size: 'sm' } )
                    ) }
                >
                    <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Export CSV
                </button>
            </div>

            { exportFailed ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                    The CSV could not be exported. Try again.
                </p>
            ) : null }

            { failed ? (
                <div
                    role="alert"
                    className="mt-6 flex flex-col items-center gap-3 rounded-lg border border-border px-4 py-10 text-center"
                >
                    <p className="text-sm text-foreground">
                        The campaign table could not be loaded.
                    </p>
                    <button
                        type="button"
                        onClick={ () => query.refetch() }
                        className={ cn(
                            buttonVariants( {
                                variant: 'outline',
                                size: 'sm',
                            } )
                        ) }
                    >
                        Retry
                    </button>
                </div>
            ) : null }

            { isEmpty ? (
                <p className="mt-6 rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    No campaigns were sent in this period.
                </p>
            ) : null }

            { failed || isEmpty ? null : (
                <div
                    className={ cn(
                        'mt-4 transition-opacity',
                        loading ? 'opacity-70' : null
                    ) }
                    aria-busy={ loading }
                >
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                { COLUMNS.map( ( column ) => {
                                    const sortable = 'title' !== column.id;
                                    const active =
                                        sortable && column.id === sort;

                                    return (
                                        <TableHead
                                            key={ column.id }
                                            scope="col"
                                            aria-sort={ ariaSortFor(
                                                sortable,
                                                active,
                                                direction
                                            ) }
                                            className={ cn(
                                                'whitespace-nowrap',
                                                'right' === column.align
                                                    ? 'text-right'
                                                    : null
                                            ) }
                                        >
                                            { sortable ? (
                                                <button
                                                    type="button"
                                                    onClick={ () =>
                                                        toggleSort(
                                                            column.id as AnalyticsCampaignSort
                                                        )
                                                    }
                                                    className={ cn(
                                                        'inline-flex items-center gap-1 rounded px-1 py-1 text-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                                                        active
                                                            ? 'text-foreground'
                                                            : null
                                                    ) }
                                                >
                                                    { column.title }
                                                    { active &&
                                                    'asc' === direction ? (
                                                        <ArrowUp
                                                            className="h-3.5 w-3.5"
                                                            aria-hidden
                                                        />
                                                    ) : null }
                                                    { active &&
                                                    'desc' === direction ? (
                                                        <ArrowDown
                                                            className="h-3.5 w-3.5"
                                                            aria-hidden
                                                        />
                                                    ) : null }
                                                    { active ? null : (
                                                        <ArrowUpDown
                                                            className="h-3.5 w-3.5 opacity-50"
                                                            aria-hidden
                                                        />
                                                    ) }
                                                </button>
                                            ) : (
                                                column.title
                                            ) }
                                        </TableHead>
                                    );
                                } ) }
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            { showSkeleton
                                ? Array.from(
                                      { length: SKELETON_ROWS },
                                      ( _, index ) => (
                                          <TableRow
                                              key={ index }
                                              className="hover:bg-transparent"
                                          >
                                              { COLUMNS.map( ( column ) => (
                                                  <TableCell key={ column.id }>
                                                      <div
                                                          className="h-4 animate-pulse rounded bg-muted"
                                                          aria-hidden
                                                      />
                                                  </TableCell>
                                              ) ) }
                                          </TableRow>
                                      )
                                  )
                                : rows.map( ( row ) => (
                                      <TableRow key={ row.id }>
                                          { COLUMNS.map( ( column ) => (
                                              <TableCell
                                                  key={ column.id }
                                                  className={ cn(
                                                      'tabular-nums',
                                                      'right' === column.align
                                                          ? 'text-right'
                                                          : null
                                                  ) }
                                              >
                                                  { renderCell( column, row ) }
                                              </TableCell>
                                          ) ) }
                                      </TableRow>
                                  ) ) }
                        </TableBody>
                    </Table>

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">
                            Page { meta?.currentPage ?? page } of { lastPage }
                            { meta
                                ? ` · ${ meta.total.toLocaleString() } ${
                                      1 === meta.total
                                          ? 'campaign'
                                          : 'campaigns'
                                  }`
                                : '' }
                        </p>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                aria-label="Previous page"
                                disabled={ page <= 1 || loading }
                                onClick={ () =>
                                    setPageState( { range, page: page - 1 } )
                                }
                                className={ cn(
                                    buttonVariants( {
                                        variant: 'outline',
                                        size: 'sm',
                                    } )
                                ) }
                            >
                                Previous
                            </button>
                            <button
                                type="button"
                                aria-label="Next page"
                                disabled={ page >= lastPage || loading }
                                onClick={ () =>
                                    setPageState( { range, page: page + 1 } )
                                }
                                className={ cn(
                                    buttonVariants( {
                                        variant: 'outline',
                                        size: 'sm',
                                    } )
                                ) }
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            ) }
        </Card>
    );
}

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, isSameDay, subDays } from 'date-fns';
import {
    AlertCircle,
    BarChart3,
    Check,
    Download,
    FileText,
    Loader2,
    Mail,
    Settings2,
    TrendingUp,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { DatePicker } from '../components/ui/date-picker';
import {
    Chip,
    PageHeader,
    SectionCard,
    SegmentedControl,
} from '../components/page-parts';
import { ReportProgressDialog } from '../components/reports/report-progress-dialog';
import type { ReportPhase } from '../components/reports/report-progress-dialog';
import { cn } from '../components/utils';
import PaidFeatureOverlay from '../components/paid-feature-overlay';
import { isUnauthorizedError, laravelFetch, laravelRequest } from '../lib/api';
import { APP_URL } from '../lib/app';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import type {
    NotifyPressSettings,
    ReportsMeta,
    ReportQueueResponse,
} from '../types';

// /reports/meta also reports whether this site emails scheduled reports.
type ReportsMetaResponse = ReportsMeta & {
    scheduledReportsEnabled?: boolean;
};

type ReportType = {
    key: string;
    title: string;
    description: string;
    icon: React.ElementType;
    routePath: string;
    iconClass: string;
    includes: string[];
};

type DownloadQuery = {
    report_type: string;
    site_id: number;
    start_date: string;
    end_date: string;
};

type NoticeState = {
    status: 'success' | 'error';
    message: string;
} | null;

const PRESETS = [
    { key: '7d', label: '7 days', days: 7 },
    { key: '30d', label: '30 days', days: 30 },
    { key: '90d', label: '90 days', days: 90 },
] as const;

type PresetKey = ( typeof PRESETS )[ number ][ 'key' ] | 'custom';

const REPORTS: ReportType[] = [
    {
        key: 'campaign-performance',
        title: 'Campaign Performance',
        description:
            'View delivery rates, click-through rates, and engagement metrics for every campaign sent in the selected period.',
        icon: BarChart3,
        routePath: '/reports/campaign-performance',
        iconClass: 'bg-violet-500/10 text-violet-600',
        includes: [ 'Delivery and click rates', 'Per-campaign breakdown' ],
    },
    {
        key: 'subscriber-growth',
        title: 'Subscriber Growth',
        description:
            'Track how your subscriber base grew over time. See new sign-ups, unsubscribes, and net growth with a monthly chart.',
        icon: TrendingUp,
        routePath: '/reports/subscriber-growth',
        iconClass: 'bg-emerald-600/10 text-emerald-700',
        includes: [ 'New and lost subscribers', 'Monthly growth chart' ],
    },
    {
        key: 'monthly-summary',
        title: 'Monthly Business Summary',
        description:
            'A high-level overview of campaign volume, total deliveries, top performing campaign, and subscriber activity.',
        icon: FileText,
        routePath: '/reports/monthly-summary',
        iconClass: 'bg-primary/10 text-primary',
        includes: [ 'Top performing campaign', 'Subscriber activity' ],
    },
];

function toInputDate( date: Date ) {
    const year = date.getFullYear();
    const month = String( date.getMonth() + 1 ).padStart( 2, '0' );
    const day = String( date.getDate() ).padStart( 2, '0' );

    return `${ year }-${ month }-${ day }`;
}

function fromInputDate( value: string ): Date | undefined {
    if ( ! value ) {
        return undefined;
    }

    return new Date( `${ value }T00:00:00` );
}

function formatDisplayDate( value: string ) {
    const date = fromInputDate( value );

    return date ? format( date, 'MMM d, yyyy' ) : '';
}

function sleep( ms: number ) {
    return new Promise( ( resolve ) => window.setTimeout( resolve, ms ) );
}

function closeModal(
    setReportModalOpen: ( value: boolean ) => void,
    setActiveReport: ( value: ReportType | null ) => void,
    setReportPhase: ( value: ReportPhase ) => void
) {
    window.setTimeout( () => {
        setReportModalOpen( false );
        setActiveReport( null );
        setReportPhase( 'idle' );
    }, 1200 );
}

function parseDownloadQuery(
    pdfUrl: string | undefined,
    fallback: DownloadQuery
): DownloadQuery {
    if ( ! pdfUrl ) {
        return fallback;
    }

    try {
        const url = new URL( pdfUrl );
        const siteId = Number(
            url.searchParams.get( 'site_id' ) || fallback.site_id
        );

        return {
            report_type:
                url.searchParams.get( 'report_type' ) || fallback.report_type,
            site_id: Number.isFinite( siteId ) ? siteId : fallback.site_id,
            start_date:
                url.searchParams.get( 'start_date' ) || fallback.start_date,
            end_date: url.searchParams.get( 'end_date' ) || fallback.end_date,
        };
    } catch ( error ) {
        return fallback;
    }
}

function filenameFromHeaders( headers: Headers, fallback: string ): string {
    const disposition = headers.get( 'content-disposition' ) || '';
    const match = disposition.match( /filename="?([^"]+)"?/i );

    return match?.[ 1 ] || fallback;
}

function downloadBlob( blob: Blob, filename: string ) {
    const objectUrl = window.URL.createObjectURL( blob );
    const link = document.createElement( 'a' );

    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild( link );
    link.click();
    link.remove();
    window.URL.revokeObjectURL( objectUrl );
}

async function pollForReportDownload(
    settings: NotifyPressSettings,
    query: DownloadQuery,
    fallbackFilename: string
) {
    for ( let attempt = 0; attempt < 75; attempt += 1 ) {
        const response = await laravelFetch( settings, '/reports/download', {
            query,
            headers: {
                Accept: 'application/pdf, application/json',
            },
        } );

        if ( response.ok ) {
            const blob = await response.blob();
            const filename = filenameFromHeaders(
                response.headers,
                fallbackFilename
            );

            downloadBlob( blob, filename );
            return;
        }

        if ( response.status === 404 ) {
            await sleep( 2000 );
            continue;
        }

        if ( response.status === 403 ) {
            throw new Error(
                'You are not allowed to download this report for the current site.'
            );
        }

        let message = 'Failed to download the generated PDF.';

        try {
            const payload = await response.json();
            message = payload?.message || message;
        } catch ( error ) {
            // Ignore JSON parse failures for non-JSON responses.
        }

        throw new Error( message );
    }

    throw new Error(
        'Report generation is taking longer than expected. Please try again.'
    );
}

export default function ReportsPage() {
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const token = getApiToken( settingsQuery.data );
    const hasToken = hasApiToken( settingsQuery.data );
    const reportsMetaQuery = useQuery( {
        queryKey: [ 'np-reports-meta', token ],
        enabled: hasToken,
        queryFn: () =>
            laravelRequest< ReportsMetaResponse >(
                settingsQuery.data,
                '/reports/meta'
            ),
    } );

    const [ startDate, setStartDate ] = useState(
        toInputDate( subDays( new Date(), 30 ) )
    );
    const [ endDate, setEndDate ] = useState( toInputDate( new Date() ) );
    const [ downloadingKey, setDownloadingKey ] = useState< string | null >(
        null
    );
    const [ reportModalOpen, setReportModalOpen ] = useState( false );
    const [ reportPhase, setReportPhase ] = useState< ReportPhase >( 'idle' );
    const [ activeReport, setActiveReport ] = useState< ReportType | null >(
        null
    );
    const [ notice, setNotice ] = useState< NoticeState >( null );

    const isLoading =
        settingsQuery.isLoading || ( hasToken && reportsMetaQuery.isLoading );
    const meta = reportsMetaQuery.data;
    const hasSites = meta?.hasSites ?? false;
    const isPaidUser = meta?.isPaidUser ?? false;
    const scheduledReportsEnabled = meta?.scheduledReportsEnabled ?? false;
    const isDateRangeValid = Boolean(
        startDate && endDate && startDate <= endDate
    );
    const connectedSiteId = Number(
        settingsQuery.data?.connectedSite?.id || 0
    );
    const siteName = settingsQuery.data?.connectedSite?.site_name ?? '';
    // Scheduled reports are a per-site setting in the app. The plugin knows
    // the connected app site id (it already sends it as `site_id` when
    // downloading), so it can open that site's Reports tab directly.
    const emailReportsSettingsUrl = connectedSiteId
        ? `${ APP_URL }/sites/${ connectedSiteId }/edit?tab=reports`
        : `${ APP_URL }/sites`;

    const downloadQuery = useMemo( () => {
        return {
            report_type: activeReport?.key || '',
            site_id: connectedSiteId,
            start_date: startDate,
            end_date: endDate,
        };
    }, [ activeReport?.key, endDate, connectedSiteId, startDate ] );

    const activePreset: PresetKey =
        PRESETS.find( ( preset ) => {
            const start = fromInputDate( startDate );
            const end = fromInputDate( endDate );

            if ( ! start || ! end ) {
                return false;
            }

            return (
                isSameDay( start, subDays( new Date(), preset.days ) ) &&
                isSameDay( end, new Date() )
            );
        } )?.key ?? 'custom';

    function applyPreset( days: number ) {
        setStartDate( toInputDate( subDays( new Date(), days ) ) );
        setEndDate( toInputDate( new Date() ) );
    }

    async function handleDownload( report: ReportType ) {
        if (
            ! isDateRangeValid ||
            ! isPaidUser ||
            ! hasSites ||
            ! settingsQuery.data
        ) {
            return;
        }

        setNotice( null );
        setDownloadingKey( report.key );
        setActiveReport( report );
        setReportModalOpen( true );
        setReportPhase( 'queued' );

        try {
            const queuedResponse = await laravelRequest< ReportQueueResponse >(
                settingsQuery.data,
                report.routePath,
                {
                    method: 'POST',
                    body: {
                        start_date: startDate,
                        end_date: endDate,
                    },
                }
            );

            setNotice( {
                status: 'success',
                message:
                    queuedResponse.message ||
                    'PDF report generation has been queued.',
            } );
            setReportPhase( 'generating' );

            const query = parseDownloadQuery( queuedResponse.pdf_url, {
                ...downloadQuery,
                report_type: report.key,
            } );

            await pollForReportDownload(
                settingsQuery.data,
                query,
                `${ report.key }.pdf`
            );

            setReportPhase( 'ready' );
            setDownloadingKey( null );
            closeModal( setReportModalOpen, setActiveReport, setReportPhase );
        } catch ( error ) {
            const message =
                error instanceof Error
                    ? error.message
                    : 'Failed to generate the PDF report.';

            setNotice( {
                status: 'error',
                message,
            } );
            setDownloadingKey( null );
            setReportPhase( 'failed' );
            closeModal( setReportModalOpen, setActiveReport, setReportPhase );
        }
    }

    if ( ! hasToken ) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card className="border-amber-200 bg-amber-50 text-amber-900">
                    <CardContent className="flex items-start gap-3 py-6">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                        <div>
                            <p className="text-sm font-semibold">
                                API token required
                            </p>
                            <p className="mt-1 text-sm text-amber-800">
                                Connect NotifyPress or add an API token in
                                Settings to load reports for this site.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (
        reportsMetaQuery.isError &&
        ! isUnauthorizedError( reportsMetaQuery.error )
    ) {
        return (
            <div className="container mx-auto px-4 py-8">
                <Card>
                    <CardContent className="py-6">
                        <p className="text-sm font-semibold text-foreground">
                            Reports unavailable
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                            { reportsMetaQuery.error instanceof Error
                                ? reportsMetaQuery.error.message
                                : 'Unable to load reports for this site.' }
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const isLocked = ! isPaidUser && ! isLoading;

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            <PageHeader
                title="Reports"
                description={
                    siteName
                        ? `Generate and download PDF reports for ${ siteName }`
                        : 'Generate and download PDF reports for your push notification performance.'
                }
            />

            { notice ? (
                <Alert
                    variant={
                        notice.status === 'error' ? 'destructive' : 'success'
                    }
                >
                    <AlertDescription>{ notice.message }</AlertDescription>
                </Alert>
            ) : null }

            { ! hasSites && ! isLoading ? (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
                    <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                        aria-hidden
                    />
                    <p className="text-sm text-amber-700">
                        You don&apos;t have any sites yet. Add a site first to
                        generate reports.
                    </p>
                </div>
            ) : null }

            <ReportProgressDialog
                open={ reportModalOpen }
                onOpenChange={ setReportModalOpen }
                phase={ reportPhase }
                reportTitle={ activeReport?.title ?? null }
            />

            { /* Same locked view as Analytics: one overlay over the whole page body. */ }
            <PaidFeatureOverlay
                isPaidUser={ ! isLocked }
                featureName="Reports"
                description="Upgrade to a Business or Premium plan to generate and download campaign, subscriber, and summary reports."
            >
                <div className="space-y-6">
                    <SectionCard
                        title="Date Range"
                        description="Select the period you want to include in your reports."
                        actions={
                            <SegmentedControl< PresetKey >
                                value={ activePreset }
                                options={ PRESETS.map( ( preset ) => ( {
                                    key: preset.key,
                                    label: preset.label,
                                } ) ) }
                                onChange={ ( key ) => {
                                    const preset = PRESETS.find(
                                        ( item ) => item.key === key
                                    );

                                    if ( preset ) {
                                        applyPreset( preset.days );
                                    }
                                } }
                                label="Quick date ranges"
                            />
                        }
                    >
                        <div className="mt-4 flex flex-wrap items-end gap-4">
                            <div className="w-full space-y-1.5 sm:w-auto [&_button]:w-full sm:[&_button]:w-[280px]">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Start Date
                                </p>
                                <DatePicker
                                    date={ fromInputDate( startDate ) }
                                    onSelect={ ( date ) => {
                                        setStartDate(
                                            date ? toInputDate( date ) : ''
                                        );
                                    } }
                                />
                            </div>
                            <div className="w-full space-y-1.5 sm:w-auto [&_button]:w-full sm:[&_button]:w-[280px]">
                                <p className="text-xs font-medium text-muted-foreground">
                                    End Date
                                </p>
                                <DatePicker
                                    date={ fromInputDate( endDate ) }
                                    onSelect={ ( date ) => {
                                        setEndDate(
                                            date ? toInputDate( date ) : ''
                                        );
                                    } }
                                />
                            </div>
                            { isDateRangeValid ? (
                                <Chip tone="primary" className="sm:mb-5">
                                    { formatDisplayDate( startDate ) } –{ ' ' }
                                    { formatDisplayDate( endDate ) }
                                </Chip>
                            ) : null }
                        </div>

                        { ! isDateRangeValid && startDate && endDate ? (
                            <p className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
                                <AlertCircle
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                />
                                End date must be on or after the start date.
                            </p>
                        ) : null }
                    </SectionCard>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
                        { REPORTS.map( ( report ) => {
                            const Icon = report.icon;
                            const isDownloading = downloadingKey === report.key;

                            return (
                                <section
                                    key={ report.key }
                                    aria-label={ report.title }
                                    className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                                >
                                    <span
                                        className={ cn(
                                            'flex h-11 w-11 items-center justify-center rounded-xl',
                                            report.iconClass
                                        ) }
                                        aria-hidden
                                    >
                                        <Icon className="h-5 w-5" />
                                    </span>
                                    <h2 className="mt-4 font-display text-lg font-semibold text-foreground">
                                        { report.title }
                                    </h2>
                                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                        { report.description }
                                    </p>
                                    <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
                                        { report.includes.map( ( item ) => (
                                            <li
                                                key={ item }
                                                className="flex items-center gap-2 text-sm text-foreground"
                                            >
                                                <Check
                                                    className="h-3.5 w-3.5 shrink-0 text-primary"
                                                    aria-hidden
                                                />
                                                { item }
                                            </li>
                                        ) ) }
                                    </ul>
                                    <Button
                                        className="mt-5 h-10 w-full gap-2"
                                        disabled={
                                            ! isDateRangeValid ||
                                            ! hasSites ||
                                            isDownloading ||
                                            ! isPaidUser ||
                                            isLoading
                                        }
                                        onClick={ () =>
                                            handleDownload( report )
                                        }
                                    >
                                        { isDownloading ? (
                                            <Loader2
                                                className="h-4 w-4 animate-spin"
                                                aria-hidden
                                            />
                                        ) : (
                                            <Download
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                        ) }
                                        { isDownloading
                                            ? 'Generating report…'
                                            : 'Generate PDF' }
                                    </Button>
                                </section>
                            );
                        } ) }
                    </div>

                    <section
                        aria-label="Scheduled Email Reports"
                        className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:p-6"
                    >
                        <span
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                            aria-hidden
                        >
                            <Mail className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="font-display text-lg font-semibold text-foreground">
                                    Scheduled Email Reports
                                </h2>
                                { scheduledReportsEnabled ? (
                                    <Chip tone="success" dot>
                                        Enabled
                                    </Chip>
                                ) : (
                                    <Chip dot>Disabled</Chip>
                                ) }
                            </div>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                { scheduledReportsEnabled
                                    ? 'Weekly and monthly PDF reports for this site are emailed to you automatically.'
                                    : 'Weekly and monthly PDF reports can be emailed to you automatically for this site.' }
                            </p>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            className="h-10 shrink-0 gap-2"
                        >
                            <a
                                href={ emailReportsSettingsUrl }
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Settings2 className="h-4 w-4" aria-hidden />
                                Email Reports settings
                            </a>
                        </Button>
                    </section>
                </div>
            </PaidFeatureOverlay>
        </div>
    );
}

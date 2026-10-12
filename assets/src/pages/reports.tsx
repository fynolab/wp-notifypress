import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AlertCircle,
    ArrowDownToLine,
    BarChart3,
    Download,
    FileText,
    Loader2,
    Lock,
    Sparkles,
    CheckCircle2,
    X,
    TrendingUp,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { DatePicker } from '../components/ui/date-picker';
import { isUnauthorizedError, laravelFetch, laravelRequest } from '../lib/api';
import { BILLING_URL } from '../lib/app';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import type {
    NotifyPressSettings,
    ReportsMeta,
    ReportQueueResponse,
} from '../types';

type ReportType = {
    key: string;
    title: string;
    description: string;
    icon: React.ElementType;
    routePath: string;
    accentClass: string;
    iconClass: string;
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

const REPORTS: ReportType[] = [
    {
        key: 'campaign-performance',
        title: 'Campaign Performance',
        description:
            'View delivery rates, click-through rates, and engagement metrics for every campaign sent in the selected period.',
        icon: BarChart3,
        routePath: '/reports/campaign-performance',
        accentClass: 'border-violet-500/30',
        iconClass: 'bg-violet-500/10 text-violet-500',
    },
    {
        key: 'subscriber-growth',
        title: 'Subscriber Growth',
        description:
            'Track how your subscriber base grew over time — new sign-ups, unsubscribes, and net growth with a monthly chart.',
        icon: TrendingUp,
        routePath: '/reports/subscriber-growth',
        accentClass: 'border-emerald-500/30',
        iconClass: 'bg-emerald-500/10 text-emerald-500',
    },
    {
        key: 'monthly-summary',
        title: 'Monthly Business Summary',
        description:
            'A high-level overview of campaign volume, total deliveries, top performing campaign, and subscriber activity.',
        icon: FileText,
        routePath: '/reports/monthly-summary',
        accentClass: 'border-blue-500/30',
        iconClass: 'bg-blue-500/10 text-blue-500',
    },
];

const progressValues = {
    idle: 0,
    queued: 28,
    generating: 66,
    ready: 100,
    failed: 100,
} as const;

const phaseCopy = {
    idle: 'Waiting',
    queued: 'Queued',
    generating: 'Generating',
    ready: 'Ready',
    failed: 'Failed',
} as const;

function toInputDate( date: Date ) {
    const year = date.getFullYear();
    const month = String( date.getMonth() + 1 ).padStart( 2, '0' );
    const day = String( date.getDate() ).padStart( 2, '0' );

    return `${ year }-${ month }-${ day }`;
}

function subtractDays( date: Date, days: number ) {
    const next = new Date( date );
    next.setDate( next.getDate() - days );
    return next;
}

function formatDisplayDate( value: string ) {
    if ( ! value ) {
        return '';
    }

    return new Intl.DateTimeFormat( 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    } ).format( new Date( `${ value }T00:00:00` ) );
}

function fromInputDate( value: string ): Date | undefined {
    if ( ! value ) {
        return undefined;
    }

    return new Date( `${ value }T00:00:00` );
}

function sleep( ms: number ) {
    return new Promise( ( resolve ) => window.setTimeout( resolve, ms ) );
}

function closeModal(
    setReportModalOpen: ( value: boolean ) => void,
    setActiveReport: ( value: ReportType | null ) => void,
    setReportPhase: (
        value: 'idle' | 'queued' | 'generating' | 'ready' | 'failed'
    ) => void
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
            laravelRequest< ReportsMeta >(
                settingsQuery.data,
                '/reports/meta'
            ),
    } );

    const [ startDate, setStartDate ] = useState(
        toInputDate( subtractDays( new Date(), 30 ) )
    );
    const [ endDate, setEndDate ] = useState( toInputDate( new Date() ) );
    const [ downloadingKey, setDownloadingKey ] = useState< string | null >(
        null
    );
    const [ reportModalOpen, setReportModalOpen ] = useState( false );
    const [ reportPhase, setReportPhase ] = useState<
        'idle' | 'queued' | 'generating' | 'ready' | 'failed'
    >( 'idle' );
    const [ activeReport, setActiveReport ] = useState< ReportType | null >(
        null
    );
    const [ notice, setNotice ] = useState< NoticeState >( null );

    const isLoading =
        settingsQuery.isLoading || ( hasToken && reportsMetaQuery.isLoading );
    const meta = reportsMetaQuery.data;
    const hasSites = meta?.hasSites ?? false;
    const isPaidUser = meta?.isPaidUser ?? false;
    const isDateRangeValid = Boolean(
        startDate && endDate && startDate <= endDate
    );

    const progressValue = progressValues[ reportPhase ];
    const phaseLabel = phaseCopy[ reportPhase ];
    const downloadQuery = useMemo( () => {
        const siteId = Number( settingsQuery.data?.connectedSite?.id || 0 );

        return {
            report_type: activeReport?.key || '',
            site_id: siteId,
            start_date: startDate,
            end_date: endDate,
        };
    }, [
        activeReport?.key,
        endDate,
        settingsQuery.data?.connectedSite?.id,
        startDate,
    ] );

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

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Reports</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Generate and download PDF reports for your push notification
                    performance.
                </p>
            </div>

            { notice ? (
                <Alert
                    variant={
                        notice.status === 'error' ? 'destructive' : 'success'
                    }
                >
                    <AlertDescription>{ notice.message }</AlertDescription>
                </Alert>
            ) : null }

            { ! isPaidUser && ! isLoading ? (
                <div className="flex items-start gap-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                            Upgrade to unlock Reports
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            PDF reports are available on Business and Premium
                            plans. Upgrade to generate and download detailed
                            reports.
                        </p>
                    </div>
                    <a
                        href={ BILLING_URL }
                        className="flex-shrink-0 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-violet-700 transition-colors"
                        rel="noopener noreferrer"
                        target="_blank"
                    >
                        <Lock className="h-3 w-3" />
                        Upgrade Plan
                    </a>
                </div>
            ) : null }

            { ! hasSites && ! isLoading ? (
                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-700">
                        You don&apos;t have any sites yet. Add a site first to
                        generate reports.
                    </p>
                </div>
            ) : null }

            <div
                className={
                    ! isPaidUser ? 'pointer-events-none select-none' : ''
                }
            >
                <Card className={ ! isPaidUser ? 'opacity-50' : '' }>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Date Range</CardTitle>
                        <CardDescription>
                            Select the period you want to include in your
                            reports.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    Start Date
                                </p>
                                <DatePicker
                                    date={ fromInputDate( startDate ) }
                                    onSelect={ ( date ) =>
                                        setStartDate(
                                            date ? toInputDate( date ) : ''
                                        )
                                    }
                                />
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs font-medium text-muted-foreground">
                                    End Date
                                </p>
                                <DatePicker
                                    date={ fromInputDate( endDate ) }
                                    onSelect={ ( date ) =>
                                        setEndDate(
                                            date ? toInputDate( date ) : ''
                                        )
                                    }
                                />
                            </div>
                        </div>

                        { ! isDateRangeValid && startDate && endDate ? (
                            <p className="mt-3 text-xs text-destructive flex items-center gap-1.5">
                                <AlertCircle className="h-3.5 w-3.5" />
                                End date must be on or after the start date.
                            </p>
                        ) : null }

                        { isDateRangeValid ? (
                            <p className="mt-3 text-xs text-muted-foreground">
                                Reporting period:{ ' ' }
                                <span className="font-medium text-foreground">
                                    { formatDisplayDate( startDate ) } –{ ' ' }
                                    { formatDisplayDate( endDate ) }
                                </span>
                            </p>
                        ) : null }
                    </CardContent>
                </Card>
            </div>

            { reportModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="relative w-full max-w-xl rounded-xl border border-border/70 bg-background p-6 shadow-2xl">
                        <button
                            type="button"
                            className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground cursor-pointer"
                            onClick={ () => setReportModalOpen( false ) }
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                                    { reportPhase === 'ready' ? (
                                        <CheckCircle2 className="h-4 w-4 text-primary" />
                                    ) : (
                                        <Sparkles className="h-4 w-4 text-primary" />
                                    ) }
                                </div>
                                <h3 className="text-lg font-semibold leading-none tracking-tight">
                                    { reportPhase === 'ready'
                                        ? 'Report is ready'
                                        : 'Generating your report' }
                                </h3>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                                { activeReport
                                    ? `${ activeReport.title } is being generated in the background.`
                                    : 'Your PDF is being prepared.' }
                            </p>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="rounded-xl border border-dashed bg-muted/30 p-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-medium text-foreground">
                                        { phaseLabel }
                                    </span>
                                    <span className="text-muted-foreground">
                                        { reportPhase === 'ready'
                                            ? 'Complete'
                                            : 'Please wait' }
                                    </span>
                                </div>
                                <div className="mt-3">
                                    <Progress value={ progressValue } />
                                </div>
                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                    <div
                                        className={ `rounded-lg px-3 py-2 ${
                                            reportPhase !== 'idle'
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                        }` }
                                    >
                                        Queue
                                    </div>
                                    <div
                                        className={ `rounded-lg px-3 py-2 ${
                                            reportPhase === 'generating'
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                        }` }
                                    >
                                        Render
                                    </div>
                                    <div
                                        className={ `rounded-lg px-3 py-2 ${
                                            reportPhase === 'ready'
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                        }` }
                                    >
                                        Download
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 rounded-xl border bg-muted/20 p-4">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                                    { reportPhase === 'ready' ? (
                                        <ArrowDownToLine className="h-4 w-4 text-primary" />
                                    ) : (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) }
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground">
                                        { reportPhase === 'ready'
                                            ? 'Download started in your browser.'
                                            : 'Keep this window open while the PDF is being prepared.' }
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        { reportPhase === 'ready'
                                            ? 'You can close this dialog now.'
                                            : 'You will not need to refresh the page.' }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null }

            <div className="relative">
                { ! isPaidUser && ! isLoading ? (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl backdrop-blur-sm bg-background/60">
                        <div className="flex flex-col items-center gap-2 text-center px-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
                                <Lock className="h-5 w-5 text-violet-500" />
                            </div>
                            <p className="text-sm font-semibold text-foreground">
                                PDF Reports are a paid feature
                            </p>
                            <p className="text-xs text-muted-foreground max-w-xs">
                                Upgrade to a Business or Premium plan to
                                generate and download campaign, subscriber, and
                                summary reports.
                            </p>
                            <a
                                href={ BILLING_URL }
                                className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-violet-700 transition-colors"
                                rel="noopener noreferrer"
                                target="_blank"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Upgrade Plan
                            </a>
                        </div>
                    </div>
                ) : null }

                <div
                    className={ `grid grid-cols-1 md:grid-cols-3 gap-5 ${
                        ! isPaidUser
                            ? 'blur-sm pointer-events-none select-none'
                            : ''
                    }` }
                >
                    { REPORTS.map( ( report ) => {
                        const Icon = report.icon;
                        const isDownloading = downloadingKey === report.key;

                        return (
                            <Card
                                key={ report.key }
                                className={ `border ${ report.accentClass } transition-colors` }
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start gap-3">
                                        <div
                                            className={ `flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${ report.iconClass }` }
                                        >
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <CardTitle className="text-sm font-semibold">
                                                { report.title }
                                            </CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        { report.description }
                                    </p>
                                    <Button
                                        size="sm"
                                        className="w-full gap-2"
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
                                        <Download className="h-3.5 w-3.5" />
                                        { isDownloading
                                            ? 'Generating report…'
                                            : 'Generate PDF' }
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    } ) }
                </div>
            </div>

            <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-5">
                    <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-foreground">
                                Scheduled Email Reports
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Weekly and monthly PDF reports are automatically
                                emailed to you. No action needed.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

import { useEffect, useState } from '@wordpress/element';
import { ArrowDownToLine, CheckCircle2, Loader2, Sparkles } from 'lucide-react';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import { InsightFrame, prefersReducedMotion } from '../insight-callout';
import { cn } from '../utils';

// The "Generating your report" dialog, ported from the app's
// resources/js/Pages/Reports.tsx. The app learns the PDF is ready from a
// Reverb event; the plugin polls /reports/download instead, so the page
// drives `phase` and this component only draws it.

export type ReportPhase = 'idle' | 'queued' | 'generating' | 'ready' | 'failed';

const PROGRESS: Record< ReportPhase, number > = {
    idle: 0,
    queued: 28,
    generating: 66,
    ready: 100,
    failed: 100,
};

const STEP_INDEX: Record< ReportPhase, number > = {
    idle: -1,
    queued: 0,
    generating: 1,
    ready: 3,
    failed: -1,
};

const STATUS_LINES: Record< ReportPhase, string[] > = {
    idle: [],
    queued: [ 'Queuing your report…', 'Gathering your campaigns…' ],
    generating: [
        'Crunching the numbers…',
        'Drawing the charts…',
        'Laying out the pages…',
    ],
    ready: [],
    failed: [],
};

const REPORT_STEPS = [ 'Queue', 'Render', 'Download' ];

const STATUS_INTERVAL_MS = 1600;

/**
 * Walks through what is happening while the PDF builds, so the wait reads
 * as work in progress rather than a frozen bar.
 *
 * @param  phase The current report phase.
 * @return {string} The status line to show.
 */
function useStatusLine( phase: ReportPhase ): string {
    const [ tick, setTick ] = useState( 0 );
    const lines = STATUS_LINES[ phase ];

    useEffect( () => {
        setTick( 0 );

        if ( STATUS_LINES[ phase ].length < 2 || prefersReducedMotion() ) {
            return;
        }

        const timer = window.setInterval( () => {
            setTick( ( current ) => current + 1 );
        }, STATUS_INTERVAL_MS );

        return () => {
            window.clearInterval( timer );
        };
    }, [ phase ] );

    if ( phase === 'ready' ) {
        return 'Your report is ready.';
    }

    if ( phase === 'failed' ) {
        return 'The report could not be generated.';
    }

    return lines[ tick % Math.max( 1, lines.length ) ] ?? 'Waiting…';
}

export function ReportProgressDialog( {
    open,
    onOpenChange,
    phase,
    reportTitle,
}: {
    open: boolean;
    onOpenChange: ( open: boolean ) => void;
    phase: ReportPhase;
    reportTitle: string | null;
} ) {
    const statusLine = useStatusLine( phase );
    const progress = PROGRESS[ phase ];
    const stepIndex = STEP_INDEX[ phase ];
    const isReady = phase === 'ready';
    const isWorking = phase === 'queued' || phase === 'generating';

    return (
        <Dialog open={ open } onOpenChange={ onOpenChange }>
            <DialogContent className="max-w-xl border-0 bg-transparent p-0 shadow-none">
                <InsightFrame innerClassName="space-y-5 p-6">
                    <DialogHeader className="text-left">
                        <DialogTitle className="flex items-center gap-3">
                            <span
                                className={ cn(
                                    'flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-violet-500 to-pink-500 text-white shadow-sm shadow-violet-500/30',
                                    isWorking ? 'np-sparkle' : null
                                ) }
                                aria-hidden
                            >
                                { isReady ? (
                                    <CheckCircle2 className="h-5 w-5" />
                                ) : (
                                    <Sparkles className="h-5 w-5" />
                                ) }
                            </span>
                            <span className="font-display text-lg">
                                { isReady
                                    ? 'Report is ready'
                                    : 'Generating your report' }
                            </span>
                        </DialogTitle>
                        <DialogDescription>
                            { reportTitle
                                ? `${ reportTitle } is being generated in the background.`
                                : 'Your PDF is being prepared.' }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <div className="flex items-center justify-between gap-3 text-sm">
                            <span
                                className={ cn(
                                    'font-medium',
                                    isWorking
                                        ? 'np-thinking'
                                        : 'text-foreground'
                                ) }
                                aria-live="polite"
                            >
                                { statusLine }
                            </span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                                { progress }%
                            </span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                            <div
                                className="np-insight-border h-full rounded-full transition-[width] duration-700 ease-out"
                                style={ { width: `${ progress }%` } }
                            />
                        </div>
                        <ol className="mt-4 grid grid-cols-3 gap-2 text-xs">
                            { REPORT_STEPS.map( ( step, index ) => {
                                const done = stepIndex > index;
                                const current = stepIndex === index;
                                let icon: JSX.Element | null = null;

                                if ( done ) {
                                    icon = (
                                        <CheckCircle2
                                            className="h-3.5 w-3.5"
                                            aria-hidden
                                        />
                                    );
                                } else if ( current ) {
                                    icon = (
                                        <Loader2
                                            className="h-3.5 w-3.5 animate-spin"
                                            aria-hidden
                                        />
                                    );
                                }

                                return (
                                    <li
                                        key={ step }
                                        className={ cn(
                                            'flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors',
                                            done || current
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-muted text-muted-foreground'
                                        ) }
                                    >
                                        { icon }
                                        { step }
                                    </li>
                                );
                            } ) }
                        </ol>
                    </div>

                    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            { isReady ? (
                                <ArrowDownToLine
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                            ) : (
                                <Loader2
                                    className="h-4 w-4 animate-spin"
                                    aria-hidden
                                />
                            ) }
                        </span>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">
                                { isReady
                                    ? 'Download started in your browser.'
                                    : 'Keep this window open while the PDF is being prepared.' }
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                { isReady
                                    ? 'You can close this dialog now.'
                                    : 'You will not need to refresh the page.' }
                            </p>
                        </div>
                    </div>
                </InsightFrame>
            </DialogContent>
        </Dialog>
    );
}

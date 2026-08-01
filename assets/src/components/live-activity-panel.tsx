import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Ban,
    Check,
    CheckCircle2,
    Clock,
    Loader2,
    Send,
    Zap,
} from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from './ui/alert-dialog';
import { cn } from './utils';
import { getSettings } from '../lib/settings';
import { laravelRequest } from '../lib/api';
import type {
    LiveSend,
    LiveSendStage,
    SendViaType,
} from '../lib/use-live-activity';

const sendViaLabels: Record< SendViaType, string > = {
    'rest-api': 'REST API',
    web: 'Web',
    mobile: 'Mobile',
    wordpress: 'WordPress',
};

const pillStyles: Record< LiveSendStage, { label: string; classes: string } > =
    {
        delivering: {
            label: 'Sending',
            classes:
                'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        },
        completed: {
            label: 'Sent',
            classes:
                'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        },
        cancelling: {
            label: 'Stopping…',
            classes:
                'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
        },
        cancelled: {
            label: 'Stopped',
            classes:
                'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        },
    };

const pillDots: Record< LiveSendStage, string > = {
    delivering: 'bg-blue-500',
    completed: 'bg-emerald-500',
    cancelling: 'bg-amber-500',
    cancelled: 'bg-red-500',
};

const pillPulsing: Record< LiveSendStage, boolean > = {
    delivering: true,
    completed: false,
    cancelling: false,
    cancelled: false,
};

function StatusPill( { stage }: { stage: LiveSendStage } ) {
    const pill = pillStyles[ stage ];

    return (
        <span
            className={ cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold',
                pill.classes
            ) }
        >
            { stage === 'cancelling' ? (
                <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
                <span className="relative flex h-2 w-2">
                    { pillPulsing[ stage ] ? (
                        <span
                            className={ cn(
                                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                                pillDots[ stage ]
                            ) }
                        />
                    ) : null }
                    <span
                        className={ cn(
                            'relative inline-flex h-2 w-2 rounded-full',
                            pillDots[ stage ]
                        ) }
                    />
                </span>
            ) }
            { pill.label }
        </span>
    );
}

type StepState = 'done' | 'active' | 'pending' | 'stopped';

// The plugin only ever sees sends mid-flight (poll-driven, no broadcast), so
// Prepare and Queue are always in the past by the time a card renders.
function stepStates(
    stage: LiveSendStage
): [ StepState, StepState, StepState ] {
    switch ( stage ) {
        case 'delivering':
        case 'cancelling':
            return [ 'done', 'done', 'active' ];
        case 'completed':
            return [ 'done', 'done', 'done' ];
        case 'cancelled':
            return [ 'done', 'done', 'stopped' ];
    }
}

function StepBubble( { state }: { state: StepState } ) {
    const classes: Record< StepState, string > = {
        done: 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500',
        active: 'border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-400',
        pending: 'border-border bg-transparent text-muted-foreground',
        stopped:
            'border-red-500 bg-red-500 text-white dark:border-red-600 dark:bg-red-600',
    };

    return (
        <span
            className={ cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2',
                classes[ state ]
            ) }
        >
            { state === 'done' ? <Check className="h-4 w-4" /> : null }
            { state === 'active' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
            ) : null }
            { state === 'pending' ? (
                <Clock className="h-3.5 w-3.5 opacity-50" />
            ) : null }
            { state === 'stopped' ? <Ban className="h-4 w-4" /> : null }
        </span>
    );
}

function StepSegment( { state, label }: { state: StepState; label: string } ) {
    const wrapperClasses: Record< StepState, string > = {
        done: 'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20',
        active: 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
        pending: 'border-border bg-transparent',
        stopped:
            'border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20',
    };

    return (
        <div
            className={ cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2',
                wrapperClasses[ state ]
            ) }
        >
            <StepBubble state={ state } />
            <span
                className={ cn(
                    'truncate text-sm font-semibold',
                    state === 'pending' ? 'text-muted-foreground' : null
                ) }
            >
                { label }
            </span>
        </div>
    );
}

const STARTING_MESSAGES = [
    'Getting the first messages out…',
    'Reaching your subscribers…',
    'Almost there…',
];

const STARTING_MESSAGE_INTERVAL_MS = 2500;

// Rotates through reassuring copy while a send sits at 0% — large sends can
// take a few seconds before the first real progress sample arrives, and a
// single static line during that gap reads as stalled even though work is
// happening server-side.
function useStartingMessage( active: boolean ): string {
    const [ index, setIndex ] = useState( 0 );

    useEffect( () => {
        if ( ! active ) {
            setIndex( 0 );
            return;
        }

        const interval = setInterval( () => {
            setIndex(
                ( current ) => ( current + 1 ) % STARTING_MESSAGES.length
            );
        }, STARTING_MESSAGE_INTERVAL_MS );

        return () => {
            clearInterval( interval );
        };
    }, [ active ] );

    return STARTING_MESSAGES[ index ];
}

type Sample = { pct: number; ts: number };

// Client-side delivery rate / time-remaining estimate. Samples arrive once per
// poll (≤5s apart), so estimates span a window instead of the last two points.
function useDeliveryEstimate( pct: number, subscriberTotal: number ) {
    const samplesRef = useRef< Sample[] >( [] );
    const [ estimate, setEstimate ] = useState< {
        rate: number | null;
        remainingSec: number | null;
    } >( { rate: null, remainingSec: null } );

    useEffect( () => {
        const previous = samplesRef.current[ samplesRef.current.length - 1 ];

        if ( previous !== undefined && pct < previous.pct ) {
            // Recurring send restarted under the same id — estimate fresh.
            samplesRef.current = [];
        }

        samplesRef.current.push( { pct, ts: Date.now() } );
        if ( samplesRef.current.length > 8 ) {
            samplesRef.current.shift();
        }

        const samples = samplesRef.current;
        const newest = samples[ samples.length - 1 ];
        const oldest = samples.find( ( sample ) => sample.pct !== newest.pct );

        if ( oldest === undefined || subscriberTotal <= 0 ) {
            setEstimate( { rate: null, remainingSec: null } );
            return;
        }

        const deltaSec = ( newest.ts - oldest.ts ) / 1000;
        const deltaNotifications =
            ( ( newest.pct - oldest.pct ) / 100 ) * subscriberTotal;

        if ( deltaSec <= 0 || deltaNotifications <= 0 ) {
            setEstimate( { rate: null, remainingSec: null } );
            return;
        }

        const rate = deltaNotifications / deltaSec;
        const remainingSec =
            ( ( ( 100 - pct ) / 100 ) * subscriberTotal ) / rate;
        setEstimate( { rate, remainingSec } );
    }, [ pct, subscriberTotal ] );

    const rateLabel =
        estimate.rate === null || estimate.rate <= 0
            ? 'Estimating…'
            : `~${
                  estimate.rate < 10
                      ? estimate.rate.toFixed( 1 )
                      : Math.round( estimate.rate ).toLocaleString()
              } notifications/sec`;

    let etaLabel = 'Estimating time remaining…';
    if ( estimate.remainingSec !== null ) {
        if ( estimate.remainingSec < 5 ) {
            etaLabel = 'A few seconds remaining';
        } else if ( estimate.remainingSec < 90 ) {
            etaLabel = `~${ Math.round( estimate.remainingSec ) }s remaining`;
        } else {
            const minutes = Math.floor( estimate.remainingSec / 60 );
            const seconds = Math.round( estimate.remainingSec % 60 );
            etaLabel = `~${ minutes }m ${ seconds }s remaining`;
        }
    }

    return { rateLabel, etaLabel };
}

type PanelProps = {
    sends: LiveSend[];
    onMarkCancelling: ( id: number | string ) => void;
};

export default function LiveActivityPanel( {
    sends,
    onMarkCancelling,
}: PanelProps ) {
    if ( sends.length === 0 ) {
        return null;
    }

    const overallPct = Math.round(
        sends.reduce( ( sum, send ) => sum + send.pct, 0 ) / sends.length
    );

    return (
        <Card className="overflow-hidden border-0 shadow-lg bg-card mb-5">
            <CardContent className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 flex items-center justify-center">
                            <span className="absolute inset-0 rounded-lg bg-blue-400 dark:bg-blue-500 animate-ping opacity-40" />
                            <div className="relative h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">
                                Live Activity
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                { sends.length } campaign
                                { sends.length === 1 ? '' : 's' } sending now
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                        </span>
                        <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                            { overallPct }% Overall
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    { sends.map( ( send ) => (
                        <PipelineCard
                            key={ send.id }
                            send={ send }
                            onMarkCancelling={ onMarkCancelling }
                        />
                    ) ) }
                </div>
            </CardContent>
        </Card>
    );
}

function prepareChecklistText(
    prepareState: StepState,
    subscriberTotal: number
): string {
    if ( prepareState !== 'done' ) {
        return 'Getting your message and audience ready…';
    }

    return subscriberTotal > 0
        ? `Your message is ready to send to ${ subscriberTotal.toLocaleString() } subscribers`
        : 'Your message is ready to send';
}

function PipelineCard( {
    send,
    onMarkCancelling,
}: {
    send: LiveSend;
    onMarkCancelling: ( id: number | string ) => void;
} ) {
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const queryClient = useQueryClient();
    const cancelMutation = useMutation( {
        mutationFn: () =>
            laravelRequest(
                settingsQuery.data,
                `/notifications/${ send.id }/cancel`,
                {
                    method: 'POST',
                }
            ),
        onSuccess: () => {
            queryClient.invalidateQueries( {
                queryKey: [ 'np-live-activity' ],
            } );
        },
    } );
    const { rateLabel, etaLabel } = useDeliveryEstimate(
        send.pct,
        send.subscriberTotal
    );

    const delivered =
        send.subscriberTotal > 0
            ? Math.round( ( send.subscriberTotal * send.pct ) / 100 )
            : 0;
    const justStarted = send.pct === 0;
    const startingMessage = useStartingMessage(
        send.stage === 'delivering' && justStarted
    );
    const [ prepareState, queueState, deliverState ] = stepStates( send.stage );
    const isCancellable = send.stage === 'delivering';

    const checklist: { key: string; state: 'active' | 'done'; text: string }[] =
        [];
    if ( prepareState === 'active' || prepareState === 'done' ) {
        checklist.push( {
            key: 'prepare',
            state: prepareState === 'done' ? 'done' : 'active',
            text: prepareChecklistText( prepareState, send.subscriberTotal ),
        } );
    }
    if ( queueState === 'active' || queueState === 'done' ) {
        checklist.push( {
            key: 'queue',
            state: queueState === 'done' ? 'done' : 'active',
            text:
                queueState === 'done'
                    ? "Lined up — it's about to send"
                    : 'Lining up to send…',
        } );
    }

    const handleCancel = () => {
        cancelMutation.mutate();
        onMarkCancelling( send.id );
    };

    return (
        <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Live send &bull; #NTF-{ send.id }
                    </p>
                    <h3 className="mt-0.5 text-lg font-semibold truncate">
                        { send.title || 'Launching your notification' }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        { send.subscriberTotal.toLocaleString() } recipients
                        &bull; { sendViaLabels[ send.created_by ] }
                    </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-2">
                    <StatusPill stage={ send.stage } />
                    { isCancellable ? (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/60"
                                >
                                    Cancel send
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Cancel this send?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will stop delivery to remaining
                                        subscribers. Messages already queued may
                                        still be delivered.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>
                                        Keep sending
                                    </AlertDialogCancel>
                                    <AlertDialogAction onClick={ handleCancel }>
                                        Cancel send
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    ) : null }
                    { send.stage === 'cancelling' ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled
                            className="border-destructive/50 text-destructive"
                        >
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                            Cancelling…
                        </Button>
                    ) : null }
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <StepSegment state={ prepareState } label="Getting ready" />
                <StepSegment state={ queueState } label="In queue" />
                <StepSegment state={ deliverState } label="Sending" />
            </div>

            { checklist.length > 0 ? (
                <ul className="space-y-1.5">
                    { checklist.map( ( item ) => (
                        <li
                            key={ item.key }
                            className="flex animate-in items-start gap-2 text-sm text-muted-foreground fade-in-0 slide-in-from-top-1 duration-300"
                        >
                            { item.state === 'done' ? (
                                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center">
                                    <span className="relative flex h-2 w-2">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                                        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                                    </span>
                                </span>
                            ) }
                            <span>{ item.text }</span>
                        </li>
                    ) ) }
                </ul>
            ) : null }

            { send.stage === 'delivering' ? (
                <div className="relative overflow-hidden rounded-lg border bg-background/60 p-4 space-y-3 dark:bg-background/40">
                    <div
                        aria-hidden="true"
                        className="absolute inset-0 animate-shimmer"
                    />
                    <div className="relative z-10 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                                </span>
                                Sending to your subscribers
                            </span>
                            <span className="text-sm text-muted-foreground">
                                { delivered.toLocaleString() } of{ ' ' }
                                { send.subscriberTotal.toLocaleString() }{ ' ' }
                                received
                            </span>
                        </div>
                        { justStarted ? (
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span className="text-sm font-medium">
                                    { startingMessage }
                                </span>
                            </div>
                        ) : (
                            <p className="text-3xl font-bold tabular-nums text-blue-600 dark:text-blue-400">
                                { send.pct }%
                            </p>
                        ) }
                        <Progress
                            value={ send.pct }
                            className={ cn(
                                'h-2',
                                justStarted && 'animate-pulse'
                            ) }
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Send className="h-3.5 w-3.5" />
                                { rateLabel }
                            </span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                { etaLabel }
                            </span>
                        </div>
                    </div>
                </div>
            ) : null }

            { send.stage === 'completed' ? (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <CheckCircle2 className="h-6 w-6 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <div>
                        <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                            Delivered to your{ ' ' }
                            { send.subscriberTotal.toLocaleString() }{ ' ' }
                            subscribers
                        </p>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">
                            Nice! This will disappear in a moment.
                        </p>
                    </div>
                </div>
            ) : null }

            { send.stage === 'cancelling' ? (
                <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                    <Loader2 className="h-6 w-6 flex-shrink-0 animate-spin text-amber-600 dark:text-amber-400" />
                    <div>
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                            Stopping this send…
                        </p>
                        <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                            We&apos;re pausing delivery to the subscribers who
                            haven&apos;t received it yet.
                        </p>
                    </div>
                </div>
            ) : null }

            { send.stage === 'cancelled' ? (
                <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <Ban className="h-6 w-6 flex-shrink-0 text-red-600 dark:text-red-400" />
                    <div>
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                            Send stopped
                        </p>
                        <p className="text-xs text-red-700/80 dark:text-red-400/80">
                            You stopped this at { send.pct }% — a few messages
                            already on their way may still arrive.
                        </p>
                    </div>
                </div>
            ) : null }
        </div>
    );
}

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSettings, hasApiToken } from './settings';
import { laravelRequest } from './api';

export type SendViaType = 'rest-api' | 'web' | 'mobile' | 'wordpress';

// Poll-driven subset of the SaaS app's stage machine: the plugin has no broadcast
// channel, so the optimistic "preparing"/"queued" stages never occur here — every
// send is discovered mid-flight ("delivering") and the pipeline card renders the
// Prepare/Queue steps as already passed.
export type LiveSendStage =
    | 'delivering'
    | 'completed'
    | 'cancelling'
    | 'cancelled';

export interface LiveSend {
    id: string;
    title: string;
    message: string;
    created_by: SendViaType;
    startedAt: string | null;
    subscriberTotal: number;
    pct: number;
    stage: LiveSendStage;
}

interface LiveActivityApiSend {
    id: number;
    title: string;
    message: string;
    created_by: SendViaType;
    started_at: string | null;
    subscriber_total: number;
    progress: number;
}

// Poll cadence for in-flight sends. The SaaS app gets these over Reverb
// websockets; the plugin has no broadcast auth, so it polls the same data
// from GET /notifications/live-activity instead. Small sends finish in a
// couple of seconds, so keep the cadence tight or they slip between polls.
const POLL_INTERVAL_MS = 5000;

// A send that finishes (or gets cancelled) simply drops out of the next poll —
// synthesize a lingering terminal row so the card shows a confirmation instead
// of blinking out.
const COMPLETED_LINGER_MS = 3000;
const CANCELLED_LINGER_MS = 2500;

function toLiveSend(
    send: LiveActivityApiSend,
    cancellingIds: Set< string >
): LiveSend {
    const id = String( send.id );
    let stage: LiveSendStage = 'delivering';

    if ( send.progress >= 100 ) {
        stage = 'completed';
    } else if ( cancellingIds.has( id ) ) {
        stage = 'cancelling';
    }

    return {
        id,
        title: send.title,
        message: send.message,
        created_by: send.created_by,
        startedAt: send.started_at,
        subscriberTotal: send.subscriber_total,
        pct: send.progress,
        stage,
    };
}

export default function useLiveActivity() {
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const settings = settingsQuery.data;

    const query = useQuery( {
        queryKey: [ 'np-live-activity', settings?.apiToken ],
        enabled: hasApiToken( settings ),
        // Override the client-wide 30s staleTime: a page mount must fetch
        // fresh or an in-flight send stays invisible until the next tick.
        staleTime: 0,
        refetchInterval: POLL_INTERVAL_MS,
        queryFn: () =>
            laravelRequest< { sends?: LiveActivityApiSend[] } >(
                settings,
                '/notifications/live-activity'
            ),
    } );

    // Ids the user cancelled locally. The server has no immediate "cancelled"
    // signal — the send just drops out of a later poll once a delivery chunk
    // notices the status flip.
    const [ cancellingIds, setCancellingIds ] = useState< Set< string > >(
        new Set()
    );
    // Terminal rows synthesized when a send disappears between polls.
    const [ lingering, setLingering ] = useState< Map< string, LiveSend > >(
        new Map()
    );
    const prevSendsRef = useRef< Map< string, LiveSend > >( new Map() );
    const lingerTimers = useRef<
        Map< string, ReturnType< typeof setTimeout > >
    >( new Map() );

    const serverSends: LiveSend[] = ( query.data?.sends || [] ).map( ( send ) =>
        toLiveSend( send, cancellingIds )
    );

    // Detect sends that vanished between polls and keep a terminal row around
    // briefly. A locally-cancelled send resolves to "cancelled"; anything else
    // finished normally and resolves to "completed" at 100%.
    useEffect( () => {
        if ( query.data === undefined ) {
            return;
        }

        const current = new Map< string, LiveSend >();
        for ( const apiSend of query.data.sends || [] ) {
            const send = toLiveSend( apiSend, cancellingIds );
            current.set( send.id, send );
        }

        for ( const [ id, previous ] of prevSendsRef.current ) {
            if ( current.has( id ) ) {
                continue;
            }

            const wasCancelling = cancellingIds.has( id );
            const row: LiveSend = {
                ...previous,
                pct: wasCancelling ? previous.pct : 100,
                stage: wasCancelling ? 'cancelled' : 'completed',
            };

            setLingering( ( prev ) => new Map( prev ).set( id, row ) );

            if ( wasCancelling ) {
                setCancellingIds( ( prev ) => {
                    const next = new Set( prev );
                    next.delete( id );
                    return next;
                } );
            }

            const existingTimer = lingerTimers.current.get( id );
            if ( existingTimer !== undefined ) {
                clearTimeout( existingTimer );
            }
            lingerTimers.current.set(
                id,
                setTimeout(
                    () => {
                        lingerTimers.current.delete( id );
                        setLingering( ( prev ) => {
                            if ( ! prev.has( id ) ) {
                                return prev;
                            }
                            const next = new Map( prev );
                            next.delete( id );
                            return next;
                        } );
                    },
                    wasCancelling ? CANCELLED_LINGER_MS : COMPLETED_LINGER_MS
                )
            );
        }

        prevSendsRef.current = current;
    }, [ query.data, cancellingIds ] );

    useEffect( () => {
        const timers = lingerTimers.current;

        return () => {
            for ( const timeout of timers.values() ) {
                clearTimeout( timeout );
            }
            timers.clear();
        };
    }, [] );

    // Flag a send as cancelling right after POSTing the cancel, so the card
    // shows immediate feedback while waiting for the send to drop from a poll.
    const markCancelling = ( id: number | string ) => {
        setCancellingIds( ( prev ) => new Set( prev ).add( String( id ) ) );
    };

    const serverIds = new Set( serverSends.map( ( send ) => send.id ) );
    const liveSends: LiveSend[] = [
        ...serverSends,
        ...Array.from( lingering.values() ).filter(
            ( send ) => ! serverIds.has( send.id )
        ),
    ];

    return { liveSends, markCancelling };
}

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
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
// The app allows 100 API requests a minute per user (shared by every tab, admin
// and site), so fast polling is kept short:
// - 1s only for a short window right after a send starts here, so a short send
//   is not missed between two polls;
// - 3s while a send is listed, which is plenty for a progress bar;
// - 15s after a failed poll (a 429 or a network error), to back off.
const BURST_POLL_INTERVAL_MS = 1000;
const BURST_WINDOW_MS = 15000;
const ACTIVE_POLL_INTERVAL_MS = 3000;
const ERROR_POLL_INTERVAL_MS = 15000;
// At most one status read per optimistic send every few seconds.
const OPTIMISTIC_CHECK_EVERY_MS = 4000;

// A send started from this admin is shown at once, before any poll sees it,
// like the app's optimistic "preparing" row. If it finishes between two polls
// the server never lists it, so its final status is read from the campaign.
const OPTIMISTIC_KEY = [ 'np-live-optimistic' ];
// Give the queue a moment before asking whether an unseen send finished.
const OPTIMISTIC_SETTLE_AFTER_MS = 2000;
// Stop waiting for a send the queue never picked up.
const OPTIMISTIC_GIVE_UP_MS = 120000;

interface OptimisticSend {
    send: LiveSend;
    createdAt: number;
}

type OptimisticSends = Record< string, OptimisticSend >;

/**
 * Show a send in the Live Activity panel right after the composer starts it.
 *
 * Shared through the query cache so the campaigns page (a different component
 * from the composer) picks it up after navigating.
 *
 * @param {QueryClient} queryClient          The app's query client.
 * @param {Object}      send                 The send the API just accepted.
 * @param {number}      send.id              Notification id.
 * @param {string}      send.title           Notification title.
 * @param {string}      send.message         Notification message.
 * @param {number}      send.subscriberTotal Audience size from the send response.
 */
export function trackOptimisticSend(
    queryClient: QueryClient,
    send: {
        id: number | string;
        title: string;
        message: string;
        subscriberTotal: number;
    }
): void {
    const id = String( send.id );

    queryClient.setQueryData< OptimisticSends >(
        OPTIMISTIC_KEY,
        ( previous ) => ( {
            ...( previous || {} ),
            [ id ]: {
                createdAt: Date.now(),
                send: {
                    id,
                    title: send.title,
                    message: send.message,
                    created_by: 'wordpress',
                    startedAt: new Date().toISOString(),
                    subscriberTotal: send.subscriberTotal,
                    pct: 0,
                    stage: 'delivering',
                },
            },
        } )
    );
}

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
    const queryClient = useQueryClient();
    const optimisticQuery = useQuery< OptimisticSends >( {
        queryKey: OPTIMISTIC_KEY,
        // Local-only state: written by trackOptimisticSend, never fetched.
        queryFn: () =>
            queryClient.getQueryData< OptimisticSends >( OPTIMISTIC_KEY ) || {},
        enabled: false,
        initialData: {},
        staleTime: Infinity,
        gcTime: Infinity,
    } );
    const optimistic = optimisticQuery.data || {};
    const hasOptimistic = Object.keys( optimistic ).length > 0;
    const newestOptimisticAt = Math.max(
        0,
        ...Object.values( optimistic ).map( ( entry ) => entry.createdAt )
    );

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
        refetchInterval: ( current ) => {
            if ( current.state.status === 'error' ) {
                return ERROR_POLL_INTERVAL_MS;
            }

            if (
                hasOptimistic &&
                Date.now() - newestOptimisticAt < BURST_WINDOW_MS
            ) {
                return BURST_POLL_INTERVAL_MS;
            }

            if (
                hasOptimistic ||
                ( current.state.data?.sends || [] ).length > 0
            ) {
                return ACTIVE_POLL_INTERVAL_MS;
            }

            return POLL_INTERVAL_MS;
        },
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
    // Status reads for optimistic sends: one in flight per id, and when each
    // id was last checked, so a slow proxy cannot stack requests up.
    const statusInFlight = useRef< Set< string > >( new Set() );
    const statusCheckedAt = useRef< Map< string, number > >( new Map() );

    const serverSends: LiveSend[] = ( query.data?.sends || [] ).map( ( send ) =>
        toLiveSend( send, cancellingIds )
    );

    const removeOptimistic = ( id: string ) => {
        queryClient.setQueryData< OptimisticSends >(
            OPTIMISTIC_KEY,
            ( previous ) => {
                if ( ! previous || ! previous[ id ] ) {
                    return previous;
                }
                const next = { ...previous };
                delete next[ id ];
                return next;
            }
        );
    };

    // Show a terminal row for a few seconds, then drop it.
    const linger = ( row: LiveSend, ms: number ) => {
        setLingering( ( prev ) => new Map( prev ).set( row.id, row ) );

        const existingTimer = lingerTimers.current.get( row.id );
        if ( existingTimer !== undefined ) {
            clearTimeout( existingTimer );
        }
        lingerTimers.current.set(
            row.id,
            setTimeout( () => {
                lingerTimers.current.delete( row.id );
                setLingering( ( prev ) => {
                    if ( ! prev.has( row.id ) ) {
                        return prev;
                    }
                    const next = new Map( prev );
                    next.delete( row.id );
                    return next;
                } );
            }, ms )
        );
    };

    const clearCancelling = ( id: string ) => {
        setCancellingIds( ( prev ) => {
            if ( ! prev.has( id ) ) {
                return prev;
            }
            const next = new Set( prev );
            next.delete( id );
            return next;
        } );
    };

    // Give up on optimistic sends on a timer as well, not only after a
    // successful poll: while polls keep failing nothing else would drop them.
    useEffect( () => {
        if ( ! hasOptimistic ) {
            return undefined;
        }

        const timer = setInterval( () => {
            const current =
                queryClient.getQueryData< OptimisticSends >( OPTIMISTIC_KEY ) ||
                {};
            const now = Date.now();

            for ( const [ id, entry ] of Object.entries( current ) ) {
                if ( now - entry.createdAt > OPTIMISTIC_GIVE_UP_MS ) {
                    removeOptimistic( id );
                    clearCancelling( id );
                }
            }
        }, OPTIMISTIC_CHECK_EVERY_MS );

        return () => clearInterval( timer );
        // eslint-disable-next-line react-hooks/exhaustive-deps -- restarts only when optimistic sends appear or clear.
    }, [ hasOptimistic ] );

    // Settle optimistic sends after every poll: once the server lists one it
    // takes over (and the vanish logic below confirms it). One the server
    // never listed finished, failed or is still queued; its status says which.
    useEffect( () => {
        if ( query.data === undefined || ! hasOptimistic ) {
            return;
        }

        const listed = new Set(
            ( query.data.sends || [] ).map( ( send ) => String( send.id ) )
        );
        const now = Date.now();

        for ( const [ id, entry ] of Object.entries( optimistic ) ) {
            if ( listed.has( id ) ) {
                removeOptimistic( id );
                continue;
            }

            const age = now - entry.createdAt;

            if ( age > OPTIMISTIC_GIVE_UP_MS ) {
                removeOptimistic( id );
                continue;
            }

            if ( age < OPTIMISTIC_SETTLE_AFTER_MS ) {
                continue;
            }

            const lastChecked = statusCheckedAt.current.get( id ) || 0;
            if (
                statusInFlight.current.has( id ) ||
                now - lastChecked < OPTIMISTIC_CHECK_EVERY_MS
            ) {
                continue;
            }

            statusInFlight.current.add( id );
            statusCheckedAt.current.set( id, now );

            laravelRequest< { data?: { status?: string } } >(
                settings,
                `/notifications/${ id }`
            )
                .then( ( response ) => {
                    const status = response?.data?.status;

                    if ( status === 'sent' ) {
                        removeOptimistic( id );
                        linger(
                            { ...entry.send, pct: 100, stage: 'completed' },
                            COMPLETED_LINGER_MS
                        );
                    } else if ( status === 'cancelled' ) {
                        removeOptimistic( id );
                        clearCancelling( id );
                        linger(
                            { ...entry.send, stage: 'cancelled' },
                            CANCELLED_LINGER_MS
                        );
                    } else if ( status === 'failed' ) {
                        removeOptimistic( id );
                        clearCancelling( id );
                    }
                } )
                .catch( () => {
                    // A failed status read leaves the row for a later check.
                } )
                .finally( () => {
                    statusInFlight.current.delete( id );
                } );
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per poll result.
    }, [ query.dataUpdatedAt ] );

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

            if ( wasCancelling ) {
                setCancellingIds( ( prev ) => {
                    const next = new Set( prev );
                    next.delete( id );
                    return next;
                } );
            }

            linger(
                row,
                wasCancelling ? CANCELLED_LINGER_MS : COMPLETED_LINGER_MS
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
    const lingeringRows = Array.from( lingering.values() ).filter(
        ( send ) => ! serverIds.has( send.id )
    );
    const shownIds = new Set( [
        ...serverIds,
        ...lingeringRows.map( ( send ) => send.id ),
    ] );
    const optimisticRows = Object.values( optimistic )
        .map(
            ( entry ): LiveSend =>
                cancellingIds.has( entry.send.id )
                    ? { ...entry.send, stage: 'cancelling' }
                    : entry.send
        )
        .filter( ( send ) => ! shownIds.has( send.id ) );
    const liveSends: LiveSend[] = [
        ...optimisticRows,
        ...serverSends,
        ...lingeringRows,
    ];

    return { liveSends, markCancelling };
}

import { useEffect, useState } from '@wordpress/element';
import { AlertTriangle, Sparkles, X } from 'lucide-react';
import { BILLING_URL } from '../../lib/app';
import type { DashboardPlanUsage } from '../../types';

const DISMISS_DAYS = 7;

type Notice = {
    kind: 'over-delivery' | 'at-capacity';
    title: string;
    body: string;
};

/**
 * Two ways a plan's subscriber limit bites, both silent elsewhere:
 * - the site has more active subscribers than the limit, so every send stops
 *   short of the rest;
 * - the whole account has reached the limit, so new visitors cannot opt in.
 *
 * @param plan              The plan's limit and account-wide usage.
 * @param activeSubscribers Active subscribers of this site.
 */
function noticeFor(
    plan: DashboardPlanUsage,
    activeSubscribers: number
): Notice | null {
    const limit = plan.subscriberLimit;

    if ( limit <= 0 ) {
        return null;
    }

    if ( activeSubscribers > limit ) {
        const missed = activeSubscribers - limit;

        return {
            kind: 'over-delivery',
            title: `${ missed.toLocaleString() } ${
                1 === missed ? 'subscriber' : 'subscribers'
            } will not receive your campaigns`,
            body: `Your ${
                plan.name
            } plan sends to ${ limit.toLocaleString() } of the ${ activeSubscribers.toLocaleString() } subscribers on this site. Upgrade to reach everyone.`,
        };
    }

    if ( plan.accountSubscribers >= limit ) {
        return {
            kind: 'at-capacity',
            title: `You have reached your plan's limit of ${ limit.toLocaleString() } subscribers`,
            body: 'New visitors cannot subscribe until you upgrade.',
        };
    }

    return null;
}

function storageKey( siteKey: string, kind: Notice[ 'kind' ] ): string {
    return `np-plan-banner-dismissed:${ siteKey }:${ kind }`;
}

function readDismissed( siteKey: string, kind: Notice[ 'kind' ] ): boolean {
    try {
        const until = Number(
            window.localStorage.getItem( storageKey( siteKey, kind ) )
        );

        return Number.isFinite( until ) && until > Date.now();
    } catch {
        return false;
    }
}

export function PlanLimitBanner( {
    plan,
    activeSubscribers,
    siteKey,
}: {
    plan: DashboardPlanUsage;
    activeSubscribers: number;
    siteKey: string;
} ) {
    const notice = noticeFor( plan, activeSubscribers );
    const kind = notice?.kind;
    const [ dismissed, setDismissed ] = useState( false );

    useEffect( () => {
        if ( kind ) {
            setDismissed( readDismissed( siteKey, kind ) );
        }
    }, [ siteKey, kind ] );

    if ( ! notice || dismissed ) {
        return null;
    }

    const dismiss = () => {
        setDismissed( true );

        try {
            window.localStorage.setItem(
                storageKey( siteKey, notice.kind ),
                String( Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000 )
            );
        } catch {
            // Private mode or blocked storage: it just shows again next time.
        }
    };

    // Same look as the plugin's other upgrade banners (PaidFeatureOverlay).
    return (
        <section
            aria-label="Plan limit"
            className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 sm:p-5"
        >
            <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10"
                aria-hidden
            >
                <AlertTriangle className="h-4 w-4 text-violet-500" />
            </div>
            <div className="min-w-0 flex-[1_1_260px]">
                <p className="font-semibold text-foreground">
                    { notice.title }
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    { notice.body }
                </p>
            </div>
            <div className="flex items-center gap-2">
                <a
                    href={ BILLING_URL }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center gap-1.5 rounded-md bg-violet-600 px-4 text-sm font-semibold text-white shadow transition-colors hover:bg-violet-700"
                >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    Upgrade plan
                </a>
                <button
                    type="button"
                    onClick={ dismiss }
                    aria-label="Dismiss for a week"
                    className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-violet-500/10 hover:text-foreground"
                >
                    <X className="h-4 w-4" aria-hidden />
                </button>
            </div>
        </section>
    );
}

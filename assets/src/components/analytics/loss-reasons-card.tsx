import { Card } from '../ui/card';
import { cn } from '../utils';
import { formatCount } from '../dashboard/format';
import type { AnalyticsAudience, AnalyticsLostReasonKey } from '../../types';

const HELP: Record< AnalyticsLostReasonKey, string > = {
    unsubscribed: 'Turned off notifications.',
    token_expired: 'Browser data cleared or long inactive.',
    token_invalid: 'Rejected by the push service.',
    other: 'Lost before reasons were tracked.',
};

export function LossReasonsCard( {
    audience,
    className,
}: {
    audience: AnalyticsAudience;
    className?: string;
} ) {
    const reasons = audience.lostReasons;

    return (
        <Card
            data-testid="analytics-loss-reasons"
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <h2 className="text-lg font-semibold text-foreground">
                Why subscribers leave
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
                Reasons for subscribers lost in this period
            </p>

            { reasons.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">
                    No subscribers lost in this period.
                </p>
            ) : (
                <>
                    <p className="mt-4 text-xs text-muted-foreground">
                        Total lost
                    </p>
                    <p className="text-2xl font-semibold text-foreground">
                        { formatCount( audience.lost ) }
                    </p>

                    <ul className="mt-4 space-y-4">
                        { reasons.map( ( reason ) => (
                            <li key={ reason.reason }>
                                <div className="flex justify-between gap-2 text-sm text-foreground">
                                    <span className="font-medium">
                                        { reason.label }
                                    </span>
                                    <span>
                                        <span className="font-semibold">
                                            { formatCount(
                                                reason.subscribers
                                            ) }
                                        </span>
                                        <span className="ml-1.5 text-muted-foreground">
                                            { reason.percentage }%
                                        </span>
                                    </span>
                                </div>
                                <div
                                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                                    aria-hidden
                                >
                                    <div
                                        className="h-full rounded-full bg-orange-600 dark:bg-orange-400"
                                        style={ {
                                            width: `${ Math.min(
                                                100,
                                                reason.percentage
                                            ) }%`,
                                        } }
                                    />
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    { HELP[ reason.reason ] }
                                </p>
                            </li>
                        ) ) }
                    </ul>
                </>
            ) }
        </Card>
    );
}

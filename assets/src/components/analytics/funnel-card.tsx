import { Send } from 'lucide-react';
import { Card } from '../ui/card';
import { cn } from '../utils';
import { formatCount } from '../dashboard/format';
import type { AnalyticsFunnel } from '../../types';

function stepRate( part: number, whole: number ): string {
    if ( whole <= 0 ) {
        return '—';
    }

    return `${ Math.min( 100, Math.round( ( part / whole ) * 100 ) ) }%`;
}

export function FunnelCard( {
    funnel,
    className,
}: {
    funnel: AnalyticsFunnel;
    className?: string;
} ) {
    const steps = [
        {
            key: 'sent',
            label: 'Sent',
            value: funnel.sent,
            rate: null,
            rateLabel: null,
            bar: 'bg-primary',
        },
        {
            key: 'delivered',
            label: 'Delivered',
            value: funnel.delivered,
            rate: stepRate( funnel.delivered, funnel.sent ),
            rateLabel: 'of sent',
            bar: 'bg-primary/75',
        },
        {
            key: 'viewed',
            label: 'Viewed',
            value: funnel.views,
            rate: stepRate( funnel.views, funnel.delivered ),
            rateLabel: 'of delivered',
            bar: 'bg-primary/50',
        },
        {
            key: 'clicked',
            label: 'Clicked',
            value: funnel.clicks,
            rate: stepRate( funnel.clicks, funnel.views ),
            rateLabel: 'of viewed',
            bar: 'bg-orange-600 dark:bg-orange-400',
        },
    ];
    const untrackedLabel = `${ funnel.untracked.toLocaleString() } ${
        funnel.untracked === 1 ? 'campaign' : 'campaigns'
    } sent before delivery tracking ${
        funnel.untracked === 1 ? 'is' : 'are'
    } not included.`;

    return (
        <Card
            data-testid="analytics-funnel"
            className={ cn(
                'flex flex-col border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <h2 className="text-lg font-semibold text-foreground">
                Delivery funnel
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
                From sent to clicked, across tracked campaigns
            </p>

            { funnel.campaigns === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2.5 px-4 py-10 text-center">
                    <span
                        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                        aria-hidden
                    >
                        <Send className="h-5 w-5" />
                    </span>
                    <p className="font-semibold text-foreground">
                        No tracked campaigns in this period
                    </p>
                    <p className="max-w-64 text-sm text-muted-foreground">
                        Delivery is tracked for campaigns sent from now on.
                    </p>
                </div>
            ) : (
                <ol className="mt-5 space-y-4">
                    { steps.map( ( step ) => (
                        <li key={ step.key }>
                            <div className="flex items-baseline justify-between gap-3 text-sm">
                                <span className="font-medium text-foreground">
                                    { step.label }
                                </span>
                                <span className="flex items-baseline gap-2">
                                    <span className="text-lg font-semibold text-foreground">
                                        { formatCount( step.value ) }
                                    </span>
                                    <span className="min-w-24 text-right text-xs text-muted-foreground">
                                        { step.rate !== null
                                            ? `${ step.rate } ${ step.rateLabel }`
                                            : '' }
                                    </span>
                                </span>
                            </div>
                            <div
                                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-muted"
                                aria-hidden
                            >
                                <div
                                    className={ cn(
                                        'h-full rounded-full',
                                        step.bar
                                    ) }
                                    style={ {
                                        width: `${
                                            funnel.sent > 0
                                                ? Math.min(
                                                      100,
                                                      ( step.value /
                                                          funnel.sent ) *
                                                          100
                                                  )
                                                : 0
                                        }%`,
                                    } }
                                />
                            </div>
                            { step.key === 'delivered' ? (
                                <p className="mt-1 text-xs text-muted-foreground">
                                    { formatCount( funnel.failed ) } failed
                                </p>
                            ) : null }
                        </li>
                    ) ) }
                </ol>
            ) }

            <div className="mt-auto space-y-1 border-t border-border pt-3.5 text-xs text-muted-foreground">
                <p>
                    Delivered means the push service accepted the message.
                    Viewed means it was shown on the device.
                </p>
                { funnel.untracked > 0 ? <p>{ untrackedLabel }</p> : null }
            </div>
        </Card>
    );
}

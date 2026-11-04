import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { InsightCallout } from '../insight-callout';
import { formatCount, formatDateTime } from './format';
import type {
    DashboardRecentClickRate,
    DashboardShareRow,
    DashboardSubscriberChange,
    DashboardUpcoming,
} from '../../types';

// Ported from the app's resources/js/Components/Dashboard/dashboard-insight.tsx.

function plural( count: number, word: string ): string {
    return `${ formatCount( count ) } ${ word }${ count === 1 ? '' : 's' }`;
}

/**
 * Two or three short sentences about the last 30 days, built from the
 * dashboard's own numbers.
 *
 * @param root0                 The dashboard numbers.
 * @param root0.change          Subscriber change over the last 30 days.
 * @param root0.recent          Click rate over the last 30 days.
 * @param root0.clickRateChange Point change on the 30 days before.
 * @param root0.devices         Device share, largest first.
 * @param root0.upcoming        Scheduled and recurring campaigns.
 */
export function dashboardInsight( {
    change,
    recent,
    clickRateChange,
    devices,
    upcoming,
}: {
    change: DashboardSubscriberChange;
    recent: DashboardRecentClickRate;
    clickRateChange: number | null;
    devices: DashboardShareRow[];
    upcoming: DashboardUpcoming;
} ): string {
    const parts: string[] = [];

    if ( change.net > 0 ) {
        parts.push(
            `Your audience grew by ${ plural( change.net, 'subscriber' ) }${
                change.percent !== null ? ` (+${ change.percent }%)` : ''
            } in the last 30 days.`
        );
    } else if ( change.net < 0 ) {
        parts.push(
            `You lost ${ plural(
                Math.abs( change.net ),
                'subscriber'
            ) } on balance in the last 30 days.`
        );
    } else {
        parts.push( 'Your audience held steady over the last 30 days.' );
    }

    if ( recent.rate !== null ) {
        if ( clickRateChange !== null && clickRateChange !== 0 ) {
            parts.push(
                `Click rate is ${ recent.rate }%, ${
                    clickRateChange > 0 ? 'up' : 'down'
                } ${ Math.abs( clickRateChange ) } points on the month before.`
            );
        } else {
            parts.push( `Click rate is ${ recent.rate }%.` );
        }
    } else {
        parts.push( 'No campaign views yet this month.' );
    }

    const device = devices[ 0 ];

    if ( device && device.percentage >= 50 ) {
        parts.push(
            `Most subscribers read on ${ device.name.toLowerCase() } (${
                device.percentage
            }%).`
        );
    }

    if ( upcoming.next?.date ) {
        parts.push(
            `Next up: "${ upcoming.next.title }" on ${ formatDateTime(
                upcoming.next.date
            ) }.`
        );
    }

    return parts.join( ' ' );
}

export function DashboardInsight(
    props: Parameters< typeof dashboardInsight >[ 0 ]
) {
    return (
        <InsightCallout
            text={ dashboardInsight( props ) }
            action={
                <Link
                    to="/analytics"
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                    See analytics
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            }
        />
    );
}

import { InsightCallout } from '../insight-callout';
import { formatCount } from '../dashboard/format';
import { rangeLabel } from './constants';
import type {
    AnalyticsBestTimes,
    AnalyticsCountries,
    AnalyticsRange,
    AnalyticsSummary,
} from '../../types';

// Ported from the app's resources/js/Components/Analytics/analytics-insight.tsx.

const DAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
];

// A country needs this many views before its click rate is worth naming.
const MIN_COUNTRY_VIEWS = 50;

function hourLong( hour: number ): string {
    const suffix = hour < 12 ? 'AM' : 'PM';

    return `${ hour % 12 === 0 ? 12 : hour % 12 } ${ suffix }`;
}

// The same slot layout as the best-times heatmap: 7 days of 24 hours,
// Monday first.
function bestSlot( bestTimes: AnalyticsBestTimes | null ): string | null {
    if ( ! bestTimes ) {
        return null;
    }

    let best = -1;
    let bestClicks = 0;

    bestTimes.clicks.forEach( ( clicks, slot ) => {
        if ( clicks > bestClicks ) {
            best = slot;
            bestClicks = clicks;
        }
    } );

    if ( best < 0 ) {
        return null;
    }

    return `${ DAYS[ Math.floor( best / 24 ) ] } around ${ hourLong(
        best % 24
    ) }`;
}

/**
 * A few short sentences about the selected range, built from the page's own
 * numbers.
 *
 * @param root0           The analytics numbers.
 * @param root0.range     The range the numbers cover.
 * @param root0.summary   KPI totals for the range and the one before.
 * @param root0.bestTimes Clicks by weekday and hour, null on the Free plan.
 * @param root0.countries Per-country engagement, null on the Free plan.
 */
export function analyticsInsight( {
    range,
    summary,
    bestTimes,
    countries,
}: {
    range: AnalyticsRange;
    summary: AnalyticsSummary;
    bestTimes: AnalyticsBestTimes | null;
    countries: AnalyticsCountries | null;
} ): string {
    const period = rangeLabel( range );
    const parts: string[] = [];
    const sent = summary.campaigns.current;
    const ctr = summary.ctr.current;
    const previous = summary.ctr.previous;

    if ( sent === 0 ) {
        return `No campaigns went out in the last ${ period }. Send one to see how it does here.`;
    }

    parts.push(
        `You sent ${ formatCount( sent ) } campaign${
            sent === 1 ? '' : 's'
        } in the last ${ period }.`
    );

    if ( ctr === null ) {
        parts.push( 'None of them has been viewed yet.' );
    } else if ( previous !== null && previous !== ctr ) {
        const delta = Math.round( ( ctr - previous ) * 10 ) / 10;

        parts.push(
            `Click rate was ${ ctr }%, ${
                delta > 0 ? 'up' : 'down'
            } ${ Math.abs( delta ) } points on the period before.`
        );
    } else {
        parts.push( `Click rate was ${ ctr }%.` );
    }

    const slot = bestSlot( bestTimes );

    if ( slot ) {
        parts.push( `Subscribers click most on ${ slot }.` );
    }

    const topCountry = ( countries?.rows ?? [] )
        .filter( ( row ) => row.views >= MIN_COUNTRY_VIEWS && row.ctr !== null )
        .sort( ( a, b ) => ( b.ctr ?? 0 ) - ( a.ctr ?? 0 ) )[ 0 ];

    if ( topCountry && topCountry.ctr !== null ) {
        parts.push(
            `Readers in ${ topCountry.name } click the most (${ topCountry.ctr }%).`
        );
    }

    return parts.join( ' ' );
}

export function AnalyticsInsight(
    props: Parameters< typeof analyticsInsight >[ 0 ]
) {
    return <InsightCallout text={ analyticsInsight( props ) } />;
}

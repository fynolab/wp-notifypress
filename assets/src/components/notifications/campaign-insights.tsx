import { Link } from 'react-router-dom';
import { ArrowRight, Monitor, Smartphone, Tablet } from 'lucide-react';
import { InsightCallout, useCountUp } from '../insight-callout';
import { formatCount } from '../dashboard/format';
import { cn } from '../utils';

// Ported from the app's resources/js/Components/Notifications/campaign-insights.tsx.

export interface CampaignAnalytics {
    views: number;
    clicks: number;
    click_through_rate: number;
    browsers: Record< string, number >;
    devices: Record< string, number >;
}

type Share = { name: string; value: number; percentage: number };

function upperFirst( value: string ): string {
    return value.charAt( 0 ).toUpperCase() + value.slice( 1 );
}

function shares( counts: Record< string, number > ): Share[] {
    const total = Object.values( counts ).reduce(
        ( sum, value ) => sum + value,
        0
    );

    return Object.entries( counts )
        .filter( ( [ , value ] ) => value > 0 )
        .sort( ( [ , a ], [ , b ] ) => b - a )
        .map( ( [ name, value ] ) => ( {
            name: upperFirst( name ),
            value,
            percentage: total > 0 ? Math.round( ( value / total ) * 100 ) : 0,
        } ) );
}

function DeviceIcon( { name }: { name: string } ) {
    const key = name.toLowerCase();

    if ( key.includes( 'mobile' ) || key.includes( 'phone' ) ) {
        return <Smartphone className="h-3.5 w-3.5" aria-hidden />;
    }

    if ( key.includes( 'tablet' ) ) {
        return <Tablet className="h-3.5 w-3.5" aria-hidden />;
    }

    return <Monitor className="h-3.5 w-3.5" aria-hidden />;
}

// A plain-language summary built from the numbers (no model involved).
function insightFor( browsers: Share[], devices: Share[] ): string {
    const browser = browsers[ 0 ];
    const device = devices[ 0 ];

    if ( browser && device ) {
        return `Most views came from ${ browser.name } (${
            browser.percentage
        }%) and from ${ device.name.toLowerCase() } devices (${
            device.percentage
        }%).`;
    }

    if ( browser ) {
        return `Most views came from ${ browser.name } (${ browser.percentage }%). No device data yet.`;
    }

    if ( device ) {
        return `Most views came from ${ device.name.toLowerCase() } devices (${
            device.percentage
        }%).`;
    }

    return 'No browser or device data for this campaign yet.';
}

// Donut slice colours step down in lightness, as on the dashboard.
const SLICE_STROKES = [
    'stroke-primary',
    'stroke-primary/60',
    'stroke-primary/25',
    'stroke-muted-foreground/30',
];

const DOT_FILLS = [
    'bg-primary',
    'bg-primary/60',
    'bg-primary/25',
    'bg-muted-foreground/30',
];

function ShareDonut( {
    label,
    rows,
    revealed,
    delay = 0,
    withDeviceIcons = false,
}: {
    label: string;
    rows: Share[];
    // Slices draw in and the centre counts up once this turns on.
    revealed: boolean;
    delay?: number;
    withDeviceIcons?: boolean;
} ) {
    const radius = 15.9155; // circumference of 100, so lengths are percentages
    const top = rows[ 0 ];
    const centre = useCountUp( top?.percentage ?? 0, revealed );
    let offset = 0;

    return (
        <section
            aria-label={ label }
            className="flex items-center gap-4 rounded-lg border border-border bg-card p-4"
        >
            <div className="relative h-24 w-24 shrink-0">
                <svg
                    viewBox="0 0 36 36"
                    className="h-24 w-24 -rotate-90"
                    aria-hidden
                >
                    <circle
                        cx="18"
                        cy="18"
                        r={ radius }
                        fill="none"
                        className="stroke-muted"
                        strokeWidth="3.5"
                    />
                    { rows.map( ( row, index ) => {
                        const length = Math.max(
                            0,
                            row.percentage - ( rows.length > 1 ? 1 : 0 )
                        );
                        const drawn = revealed ? length : 0;
                        const slice = (
                            <circle
                                key={ row.name }
                                cx="18"
                                cy="18"
                                r={ radius }
                                fill="none"
                                strokeWidth="3.5"
                                strokeLinecap="butt"
                                strokeDasharray={ `${ drawn } ${
                                    100 - drawn
                                }` }
                                strokeDashoffset={ -offset }
                                className={ cn(
                                    'transition-[stroke-dasharray] duration-700 ease-out motion-reduce:transition-none',
                                    SLICE_STROKES[
                                        index % SLICE_STROKES.length
                                    ]
                                ) }
                                style={ {
                                    transitionDelay: `${
                                        delay + index * 120
                                    }ms`,
                                } }
                            />
                        );
                        offset += row.percentage;

                        return slice;
                    } ) }
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    { top ? (
                        <>
                            <span className="font-display text-lg font-semibold leading-none tabular-nums text-foreground">
                                { centre }%
                            </span>
                            <span className="mt-0.5 max-w-16 truncate text-[10px] font-medium text-muted-foreground">
                                { top.name }
                            </span>
                        </>
                    ) : (
                        <span className="text-[10px] text-muted-foreground">
                            No data
                        </span>
                    ) }
                </div>
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    { label }
                </p>
                { rows.length === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                        No { label.toLowerCase() } recorded yet.
                    </p>
                ) : (
                    <ul className="mt-2 space-y-1.5">
                        { rows.map( ( row, index ) => (
                            <li
                                key={ row.name }
                                className={ cn(
                                    'flex items-center justify-between gap-3 text-sm',
                                    revealed ? 'np-fade-up' : 'opacity-0'
                                ) }
                                style={ {
                                    animationDelay: `${
                                        delay + 150 + index * 90
                                    }ms`,
                                } }
                            >
                                <span className="flex min-w-0 items-center gap-2 text-foreground">
                                    <span
                                        className={ cn(
                                            'h-2.5 w-2.5 shrink-0 rounded-full',
                                            DOT_FILLS[
                                                index % DOT_FILLS.length
                                            ]
                                        ) }
                                        aria-hidden
                                    />
                                    { withDeviceIcons ? (
                                        <DeviceIcon name={ row.name } />
                                    ) : null }
                                    <span className="truncate">
                                        { row.name }
                                    </span>
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                    { formatCount( row.value ) }{ ' ' }
                                    <span className="font-semibold text-foreground">
                                        { row.percentage }%
                                    </span>
                                </span>
                            </li>
                        ) ) }
                    </ul>
                ) }
            </div>
        </section>
    );
}

/**
 * The per-campaign breakdown shown when a campaign row is expanded. The row
 * itself already shows views, clicks and click rate.
 *
 * @param root0           Component props.
 * @param root0.analytics The campaign's normalised analytics.
 */
export function CampaignInsights( {
    analytics,
}: {
    analytics: CampaignAnalytics;
} ) {
    const browsers = shares( analytics.browsers );
    const devices = shares( analytics.devices );

    return (
        <InsightCallout
            text={ insightFor( browsers, devices ) }
            action={
                <Link
                    to="/analytics"
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                    Full analytics
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
            }
        >
            { ( revealed ) => (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <ShareDonut
                        label="Browsers"
                        rows={ browsers }
                        revealed={ revealed }
                    />
                    <ShareDonut
                        label="Devices"
                        rows={ devices }
                        revealed={ revealed }
                        delay={ 150 }
                        withDeviceIcons
                    />
                </div>
            ) }
        </InsightCallout>
    );
}

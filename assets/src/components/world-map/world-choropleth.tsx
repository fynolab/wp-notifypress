import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import type { KeyboardEvent, MouseEvent } from 'react';
import { geoArea, geoEqualEarth, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type {
    Feature,
    FeatureCollection,
    Geometry,
    MultiPolygon,
    Polygon,
    Position,
} from 'geojson';
import { cn } from '../utils';
import {
    NUMERIC_TO_ALPHA2,
    SMALL_COUNTRY_COORDINATES,
    flagFromCode,
} from './country-codes';
import type { MapCountry } from './types';

const WIDTH = 960;
const HEIGHT = 440;

// Fitting centres the full bounds, which include Hawaii and the Aleutians far to
// the west, so the main land sits right of centre. Nudge it left (viewBox units)
// to leave about the same space before Alaska as after New Zealand.
const MAP_OFFSET_X = -50;

// Tint of the primary colour per bucket, lightest to darkest. Kept soft so the
// glowing points carry the emphasis, like the original static map.
const BUCKET_ALPHAS = [ 0.16, 0.24, 0.34, 0.46, 0.6 ];

// How many of the top countries send out splash rings from their point.
const PULSING_POINTS = 3;

// Splash ring colours per rank, matching the top-country rows' bar colours
// (blue, purple, cyan, emerald, amber). Lighter shades in dark mode so the
// rings stand out against tinted countries.
const PULSE_COLORS = [
    'fill-blue-500/20 stroke-blue-500 dark:fill-blue-300/15 dark:stroke-blue-300',
    'fill-purple-500/20 stroke-purple-500 dark:fill-purple-300/15 dark:stroke-purple-300',
    'fill-cyan-500/20 stroke-cyan-500 dark:fill-cyan-300/15 dark:stroke-cyan-300',
    'fill-emerald-500/20 stroke-emerald-500 dark:fill-emerald-300/15 dark:stroke-emerald-300',
    'fill-amber-500/20 stroke-amber-500 dark:fill-amber-300/15 dark:stroke-amber-300',
];

// The top countries' points send out expanding "splash" rings: two staggered
// waves on a slow loop, so one is always visible.
const PULSE_WAVES = [ 0, 1 ];
const PULSE_SECONDS = 2.6;

type CountryFeature = Feature< Geometry, { name: string } > & { code: string };

type Props = {
    countries: MapCountry[];
    /** Top-country codes in list order; drives which points splash and in which colour. */
    topCodes: Array< string | null >;
    totalWithCountry: number;
    hoveredCode: string | null;
    selectedCode: string | null;
    muted?: boolean;
    onHover: ( code: string | null ) => void;
    onSelect: ( code: string ) => void;
};

/**
 * Quantile thresholds over the non-zero counts. Subscriber counts are heavily
 * skewed (one country often holds most of a site's audience), so a linear
 * scale would leave everything but the leader looking empty.
 *
 * @param values Subscriber counts of countries that have subscribers.
 * @return Ascending, de-duplicated bucket thresholds.
 */
function quantileThresholds( values: number[] ): number[] {
    const sorted = [ ...values ].sort( ( a, b ) => a - b );

    if ( sorted.length === 0 ) {
        return [];
    }

    const thresholds: number[] = [];

    for ( let i = 1; i < BUCKET_ALPHAS.length; i++ ) {
        const value =
            sorted[
                Math.floor( ( i / BUCKET_ALPHAS.length ) * sorted.length )
            ];

        if ( value !== undefined && ! thresholds.includes( value ) ) {
            thresholds.push( value );
        }
    }

    return thresholds;
}

function bucketFor( value: number, thresholds: number[] ): number {
    let bucket = 0;

    for ( const threshold of thresholds ) {
        if ( value >= threshold ) {
            bucket++;
        }
    }

    // Spread the buckets we have over the full ramp so few distinct values still
    // span light to dark.
    if ( thresholds.length === 0 ) {
        return BUCKET_ALPHAS.length - 1;
    }

    return Math.round(
        ( bucket / thresholds.length ) * ( BUCKET_ALPHAS.length - 1 )
    );
}

/**
 * Centroid anchor for a country's point: its largest polygon, so the USA's
 * point sits on the mainland rather than being pulled towards Alaska.
 *
 * @param country A country feature from the topology.
 * @return The country's largest polygon, or the country itself.
 */
function mainlandFeature( country: CountryFeature ): Feature< Geometry > {
    if ( country.geometry.type !== 'MultiPolygon' ) {
        return country;
    }

    const polygons = ( country.geometry as MultiPolygon ).coordinates.map(
        ( coordinates: Position[][] ) =>
            ( {
                type: 'Feature',
                properties: {},
                geometry: { type: 'Polygon', coordinates },
            } ) as Feature< Polygon >
    );

    return polygons.reduce(
        ( largest: Feature< Polygon >, polygon: Feature< Polygon > ) =>
            geoArea( polygon ) > geoArea( largest ) ? polygon : largest
    );
}

export function WorldChoropleth( {
    countries,
    topCodes,
    totalWithCountry,
    hoveredCode,
    selectedCode,
    muted = false,
    onHover,
    onSelect,
}: Props ) {
    const containerRef = useRef< HTMLDivElement >( null );
    const [ features, setFeatures ] = useState< CountryFeature[] | null >(
        null
    );
    const [ pointer, setPointer ] = useState< { x: number; y: number } | null >(
        null
    );

    // The topology is ~100 KB, so it loads in its own chunk after the dashboard.
    useEffect( () => {
        let cancelled = false;

        import( 'world-atlas/countries-110m.json' ).then( ( module ) => {
            if ( cancelled ) {
                return;
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const topology = module.default as any;
            const collection = feature(
                topology,
                topology.objects.countries
            ) as unknown as FeatureCollection< Geometry, { name: string } >;

            setFeatures(
                collection.features
                    .map( ( country ) => ( {
                        ...country,
                        code: NUMERIC_TO_ALPHA2[ String( country.id ) ] ?? '',
                    } ) )
                    .filter( ( country ) => country.code !== 'AQ' )
            );
        } );

        return () => {
            cancelled = true;
        };
    }, [] );

    const byCode = useMemo( () => {
        const map = new Map< string, MapCountry >();

        countries.forEach( ( country ) => {
            map.set( country.code, country );
        } );

        return map;
    }, [ countries ] );

    const thresholds = useMemo(
        () =>
            quantileThresholds(
                countries.map( ( country ) => country.subscribers )
            ),
        [ countries ]
    );

    const projection = useMemo( () => {
        const base = geoEqualEarth();

        if ( features ) {
            base.fitSize( [ WIDTH, HEIGHT ], {
                type: 'FeatureCollection',
                features,
            } );

            const [ x, y ] = base.translate();
            base.translate( [ x + MAP_OFFSET_X, y ] );
        }

        return base;
    }, [ features ] );

    const path = useMemo( () => geoPath( projection ), [ projection ] );

    // Unique per instance so two maps on one page never share <defs> ids.
    const [ uid ] = useState(
        () => `np-map-${ Math.random().toString( 36 ).slice( 2 ) }`
    );

    function pulseClassFor( code: string ): string | null {
        const rank = topCodes.indexOf( code );

        if ( rank < 0 || rank >= PULSING_POINTS ) {
            return null;
        }

        return PULSE_COLORS[ rank % PULSE_COLORS.length ];
    }

    /**
     * One glowing point per country with subscribers, sized by bucket. Countries
     * too small for a polygon at 1:110m are only reachable through their point,
     * so those points are interactive.
     */
    const points = useMemo( () => {
        if ( ! features ) {
            return [];
        }

        return countries
            .map( ( country ) => {
                const polygon = features.find(
                    ( item ) => item.code === country.code
                );
                let point: [ number, number ] | null = null;

                if ( polygon ) {
                    const centroid = path.centroid(
                        mainlandFeature( polygon )
                    );
                    point = Number.isFinite( centroid[ 0 ] )
                        ? ( centroid as [ number, number ] )
                        : null;
                } else if ( SMALL_COUNTRY_COORDINATES[ country.code ] ) {
                    point =
                        projection(
                            SMALL_COUNTRY_COORDINATES[ country.code ]
                        ) ?? null;
                }

                return point
                    ? {
                          country,
                          point,
                          bucket: bucketFor( country.subscribers, thresholds ),
                          pulseClass: pulseClassFor( country.code ),
                          interactive: ! polygon,
                      }
                    : null;
            } )
            .filter(
                (
                    item
                ): item is {
                    country: MapCountry;
                    point: [ number, number ];
                    bucket: number;
                    pulseClass: string | null;
                    interactive: boolean;
                } => item !== null
            );
    }, [ countries, features, path, projection, thresholds, topCodes ] );

    function fillFor( code: string ): string {
        const country = byCode.get( code );

        if ( ! country || muted ) {
            return 'hsl(var(--foreground) / 0.13)';
        }

        return `hsl(var(--primary) / ${
            BUCKET_ALPHAS[ bucketFor( country.subscribers, thresholds ) ]
        })`;
    }

    function trackPointer( event: MouseEvent ) {
        const bounds = containerRef.current?.getBoundingClientRect();

        if ( ! bounds ) {
            return;
        }

        setPointer( {
            x: event.clientX - bounds.left,
            y: event.clientY - bounds.top,
        } );
    }

    function handleKeyDown( event: KeyboardEvent, code: string ) {
        if ( event.key === 'Enter' || event.key === ' ' ) {
            event.preventDefault();
            onSelect( code );
        }
    }

    const hovered = hoveredCode ? byCode.get( hoveredCode ) : undefined;
    const hoveredName =
        hovered?.name ??
        features?.find( ( country ) => country.code === hoveredCode )
            ?.properties.name;

    if ( ! features ) {
        return (
            <div className="h-full w-full animate-pulse rounded-xl bg-muted/60" />
        );
    }

    return (
        <div
            ref={ containerRef }
            className="relative h-full w-full"
            onMouseLeave={ () => {
                setPointer( null );
                onHover( null );
            } }
        >
            <svg
                viewBox={ `0 0 ${ WIDTH } ${ HEIGHT }` }
                className="h-full w-full"
                role="img"
                aria-label="World map of subscribers by country"
            >
                <defs>
                    <filter
                        id={ `${ uid }-glow` }
                        x="-100%"
                        y="-100%"
                        width="300%"
                        height="300%"
                    >
                        <feGaussianBlur stdDeviation="3" />
                    </filter>
                </defs>

                <g>
                    { features.map( ( country, index ) => {
                        const data = byCode.get( country.code );
                        const isActive =
                            country.code !== '' &&
                            ( country.code === hoveredCode ||
                                country.code === selectedCode );
                        const interactive = data !== undefined && ! muted;

                        return (
                            <path
                                key={ country.code || `feature-${ index }` }
                                d={ path( country ) ?? undefined }
                                fill={ fillFor( country.code ) }
                                stroke={
                                    isActive
                                        ? 'hsl(var(--primary))'
                                        : 'hsl(var(--card))'
                                }
                                strokeWidth={ isActive ? 1.2 : 0.5 }
                                className={ cn(
                                    'transition-[fill,stroke] duration-150 outline-none',
                                    interactive
                                        ? 'cursor-pointer focus-visible:stroke-[hsl(var(--ring))]'
                                        : null
                                ) }
                                tabIndex={ interactive ? 0 : undefined }
                                role={ interactive ? 'button' : undefined }
                                aria-label={
                                    interactive
                                        ? `${
                                              data.name
                                          }, ${ data.subscribers.toLocaleString() } subscribers`
                                        : undefined
                                }
                                aria-pressed={
                                    interactive
                                        ? country.code === selectedCode
                                        : undefined
                                }
                                onMouseEnter={ () => {
                                    onHover(
                                        interactive ? country.code : null
                                    );
                                } }
                                onMouseMove={ trackPointer }
                                onFocus={ () => {
                                    onHover(
                                        interactive ? country.code : null
                                    );
                                } }
                                onBlur={ () => {
                                    onHover( null );
                                } }
                                onClick={ () => {
                                    if ( interactive ) {
                                        onSelect( country.code );
                                    }
                                } }
                                onKeyDown={ ( event ) => {
                                    if ( interactive ) {
                                        handleKeyDown( event, country.code );
                                    }
                                } }
                            />
                        );
                    } ) }
                </g>

                { muted ? null : (
                    <g>
                        { points.map(
                            ( {
                                country,
                                point,
                                bucket,
                                pulseClass,
                                interactive,
                            } ) => {
                                const isActive =
                                    country.code === hoveredCode ||
                                    country.code === selectedCode;
                                const radius =
                                    1.8 + bucket * 0.55 + ( isActive ? 1 : 0 );

                                return (
                                    <g
                                        key={ `point-${ country.code }` }
                                        transform={ `translate(${ point[ 0 ] }, ${ point[ 1 ] })` }
                                        className={
                                            interactive
                                                ? 'cursor-pointer outline-none'
                                                : 'pointer-events-none'
                                        }
                                        tabIndex={ interactive ? 0 : undefined }
                                        role={
                                            interactive ? 'button' : undefined
                                        }
                                        aria-hidden={
                                            interactive ? undefined : true
                                        }
                                        aria-label={
                                            interactive
                                                ? `${
                                                      country.name
                                                  }, ${ country.subscribers.toLocaleString() } subscribers`
                                                : undefined
                                        }
                                        onMouseEnter={
                                            interactive
                                                ? () => {
                                                      onHover( country.code );
                                                  }
                                                : undefined
                                        }
                                        onMouseMove={
                                            interactive
                                                ? trackPointer
                                                : undefined
                                        }
                                        onFocus={
                                            interactive
                                                ? () => {
                                                      onHover( country.code );
                                                  }
                                                : undefined
                                        }
                                        onBlur={
                                            interactive
                                                ? () => {
                                                      onHover( null );
                                                  }
                                                : undefined
                                        }
                                        onClick={
                                            interactive
                                                ? () => {
                                                      onSelect( country.code );
                                                  }
                                                : undefined
                                        }
                                        onKeyDown={
                                            interactive
                                                ? ( event ) => {
                                                      handleKeyDown(
                                                          event,
                                                          country.code
                                                      );
                                                  }
                                                : undefined
                                        }
                                    >
                                        { interactive ? (
                                            <circle
                                                r={ 9 }
                                                fill="transparent"
                                            />
                                        ) : null }
                                        <circle
                                            r={ radius * 3 }
                                            fill="hsl(var(--primary))"
                                            opacity={ isActive ? 0.55 : 0.35 }
                                            filter={ `url(#${ uid }-glow)` }
                                        />
                                        { pulseClass ? (
                                            <g className="motion-reduce:hidden">
                                                { PULSE_WAVES.map( ( wave ) => (
                                                    <circle
                                                        key={ wave }
                                                        r={ radius }
                                                        strokeWidth={ 2 }
                                                        className={ pulseClass }
                                                        opacity={ 0 }
                                                    >
                                                        <animate
                                                            attributeName="r"
                                                            from={ radius }
                                                            to={ radius * 10 }
                                                            dur={ `${ PULSE_SECONDS }s` }
                                                            begin={ `${
                                                                ( wave *
                                                                    PULSE_SECONDS ) /
                                                                PULSE_WAVES.length
                                                            }s` }
                                                            repeatCount="indefinite"
                                                        />
                                                        <animate
                                                            attributeName="opacity"
                                                            values="1;0"
                                                            dur={ `${ PULSE_SECONDS }s` }
                                                            begin={ `${
                                                                ( wave *
                                                                    PULSE_SECONDS ) /
                                                                PULSE_WAVES.length
                                                            }s` }
                                                            repeatCount="indefinite"
                                                        />
                                                    </circle>
                                                ) ) }
                                            </g>
                                        ) : null }
                                        <circle
                                            r={ radius }
                                            fill="hsl(var(--primary))"
                                            stroke="hsl(var(--primary-foreground) / 0.8)"
                                            strokeWidth={ 0.8 }
                                        />
                                    </g>
                                );
                            }
                        ) }
                    </g>
                ) }
            </svg>

            { hovered && pointer ? (
                <div
                    className="pointer-events-none absolute z-10 min-w-[160px] -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-lg"
                    style={ {
                        left: Math.min(
                            Math.max( pointer.x, 90 ),
                            ( containerRef.current?.clientWidth ?? 0 ) - 90
                        ),
                        top: Math.max( pointer.y - 72, 4 ),
                    } }
                >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        <span>{ flagFromCode( hovered.code ) }</span>
                        <span>{ hoveredName }</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                        { hovered.subscribers.toLocaleString() } subscribers
                        { totalWithCountry > 0
                            ? ` · ${ (
                                  ( hovered.subscribers / totalWithCountry ) *
                                  100
                              ).toFixed( 1 ) }%`
                            : null }
                    </div>
                </div>
            ) : null }

            { muted ? null : (
                <div className="pointer-events-none absolute bottom-2 left-2 hidden sm:flex items-center gap-1.5 rounded-md bg-card/80 px-2 py-1 text-[10px] text-muted-foreground backdrop-blur-sm">
                    <span>Fewer</span>
                    { BUCKET_ALPHAS.map( ( alpha ) => (
                        <span
                            key={ alpha }
                            className="h-2 w-4 rounded-sm"
                            style={ {
                                backgroundColor: `hsl(var(--primary) / ${ alpha })`,
                            } }
                        />
                    ) ) }
                    <span>More</span>
                </div>
            ) }
        </div>
    );
}

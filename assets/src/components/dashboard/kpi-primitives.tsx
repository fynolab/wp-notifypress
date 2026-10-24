import type { ReactNode } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '../utils';

export type Tone = 'up' | 'down' | 'neutral';

export function toneFor( value: number | null ): Tone {
    if ( null === value || 0 === value ) {
        return 'neutral';
    }

    return value > 0 ? 'up' : 'down';
}

export function CardShell( {
    label,
    children,
}: {
    label: string;
    children: ReactNode;
} ) {
    return (
        <section
            aria-label={ label }
            className="flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5"
        >
            { children }
        </section>
    );
}

export function CardLabel( { title, hint }: { title: string; hint?: string } ) {
    return (
        <p className="text-sm font-medium text-muted-foreground">
            { title }
            { hint ? <span className="font-normal"> · { hint }</span> : null }
        </p>
    );
}

export function BigNumber( { children }: { children: ReactNode } ) {
    return (
        <p className="text-2xl font-semibold leading-none tracking-tight text-foreground sm:text-3xl">
            { children }
        </p>
    );
}

export function DeltaChip( {
    tone,
    children,
}: {
    tone: Tone;
    children: string;
} ) {
    return (
        <span
            className={ cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
                'up' === tone
                    ? 'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400'
                    : null,
                'down' === tone
                    ? 'bg-orange-600/10 text-orange-700 dark:bg-orange-400/10 dark:text-orange-400'
                    : null,
                'neutral' === tone ? 'bg-muted text-muted-foreground' : null
            ) }
        >
            { 'up' === tone ? (
                <TrendingUp className="h-3 w-3" aria-hidden />
            ) : null }
            { 'down' === tone ? (
                <TrendingDown className="h-3 w-3" aria-hidden />
            ) : null }
            { children }
        </span>
    );
}

export function CardFooter( { children }: { children: ReactNode } ) {
    return (
        <div className="mt-auto border-t border-border pt-2.5 text-xs text-muted-foreground">
            { children }
        </div>
    );
}

// A filled line of up to a few dozen points. Purely decorative: the numbers it
// summarises are on the card.
export function Sparkline( { values }: { values: number[] } ) {
    if ( values.length < 2 ) {
        return <div className="h-9" aria-hidden />;
    }

    const min = Math.min( ...values );
    const max = Math.max( ...values );
    const span = max - min || 1;
    const points = values.map( ( value, index ) => {
        const x = ( index / ( values.length - 1 ) ) * 120;
        const y = 34 - ( ( value - min ) / span ) * 30;

        return `${ x.toFixed( 1 ) } ${ y.toFixed( 1 ) }`;
    } );
    const line = `M${ points.join( ' L' ) }`;

    return (
        <svg
            viewBox="0 0 120 36"
            preserveAspectRatio="none"
            className="block h-9 w-full text-primary"
            aria-hidden
        >
            <path
                d={ `${ line } L120 36 L0 36 Z` }
                className="fill-primary/10"
            />
            <path
                d={ line }
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

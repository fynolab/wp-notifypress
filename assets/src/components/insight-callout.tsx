import * as React from 'react';
import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

import { cn } from './utils';

// Shared "written for you" treatment for plain-language summaries built from
// the page's own numbers. Nothing here calls a model; it only looks the part.
// Ported from the app's resources/js/Components/Insights/insight-callout.tsx.
// Styles live in assets/src/scss/style.scss (np-* classes).

const THINKING_MS = 650;
const TYPE_MS_PER_CHAR = 14;

export function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        window.matchMedia?.( '(prefers-reduced-motion: reduce)' ).matches ===
            true
    );
}

export type InsightPhase = 'thinking' | 'typing' | 'done';

/**
 * "Thinking", then types the text out. Starts again whenever the text
 * changes, and skips straight to the full text for reduced motion.
 *
 * @param text The full sentence to type out.
 */
export function useTypewriter( text: string ): {
    phase: InsightPhase;
    shown: string;
} {
    const [ phase, setPhase ] = useState< InsightPhase >( () =>
        prefersReducedMotion() ? 'done' : 'thinking'
    );
    const [ length, setLength ] = useState( () =>
        prefersReducedMotion() ? text.length : 0
    );

    useEffect( () => {
        if ( prefersReducedMotion() ) {
            setPhase( 'done' );
            setLength( text.length );

            return;
        }

        setPhase( 'thinking' );
        setLength( 0 );

        let interval: number | undefined;
        const start = window.setTimeout( () => {
            setPhase( 'typing' );
            interval = window.setInterval( () => {
                setLength( ( current ) => {
                    if ( current >= text.length ) {
                        window.clearInterval( interval );
                        setPhase( 'done' );

                        return current;
                    }

                    return current + 1;
                } );
            }, TYPE_MS_PER_CHAR );
        }, THINKING_MS );

        return () => {
            window.clearTimeout( start );
            window.clearInterval( interval );
        };
    }, [ text ] );

    return { phase, shown: text.slice( 0, length ) };
}

/**
 * Counts from 0 to `target` once `active` turns on.
 *
 * @param target   The number to count up to.
 * @param active   Starts counting once true.
 * @param duration Animation length in milliseconds.
 */
export function useCountUp(
    target: number,
    active: boolean,
    duration = 800
): number {
    const [ value, setValue ] = useState( () =>
        prefersReducedMotion() ? target : 0
    );

    useEffect( () => {
        if ( ! active ) {
            return;
        }

        if ( prefersReducedMotion() ) {
            setValue( target );

            return;
        }

        let frame = 0;
        const startedAt = performance.now();
        const tick = ( now: number ) => {
            const progress = Math.min( 1, ( now - startedAt ) / duration );
            const eased = 1 - Math.pow( 1 - progress, 3 );

            setValue( Math.round( target * eased ) );

            if ( progress < 1 ) {
                frame = window.requestAnimationFrame( tick );
            }
        };

        frame = window.requestAnimationFrame( tick );

        return () => {
            window.cancelAnimationFrame( frame );
        };
    }, [ target, active, duration ] );

    return value;
}

export function InsightBadge( {
    animating = false,
    label = 'Insight',
}: {
    animating?: boolean;
    label?: string;
} ) {
    return (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-primary/15 via-violet-500/15 to-pink-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
            <Sparkles
                className={ cn(
                    'h-3 w-3 text-violet-500',
                    animating ? 'np-sparkle' : null
                ) }
                aria-hidden
            />
            <span className="np-insight-text">{ label }</span>
        </span>
    );
}

/**
 * The sentence itself: shimmering "thinking" text, then typed out.
 * @param root0
 * @param root0.text
 * @param root0.phase
 * @param root0.shown
 * @param root0.thinkingLabel
 * @param root0.className
 */
export function InsightText( {
    text,
    phase,
    shown,
    thinkingLabel = 'Reading the numbers…',
    className,
}: {
    text: string;
    phase: InsightPhase;
    shown: string;
    thinkingLabel?: string;
    className?: string;
} ) {
    return (
        <>
            { /* Screen readers get the whole sentence at once. */ }
            <p className="sr-only">{ text }</p>
            <p
                className={ cn(
                    'min-h-5 text-sm leading-5 text-foreground',
                    className
                ) }
                aria-hidden
            >
                { phase === 'thinking' ? (
                    <span className="np-thinking font-medium">
                        { thinkingLabel }
                    </span>
                ) : (
                    <>
                        { shown }
                        { phase === 'typing' ? (
                            <span className="np-caret ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 rounded-full bg-violet-500" />
                        ) : null }
                    </>
                ) }
            </p>
        </>
    );
}

/**
 * Gradient-bordered, softly glowing container.
 * @param root0
 * @param root0.children
 * @param root0.className
 * @param root0.innerClassName
 */
export function InsightFrame( {
    children,
    className,
    innerClassName,
}: {
    children: React.ReactNode;
    className?: string;
    innerClassName?: string;
} ) {
    return (
        <div
            className={ cn(
                'np-insight-border rounded-xl p-px shadow-[0_8px_30px_-12px] shadow-violet-500/30',
                className
            ) }
        >
            <div
                className={ cn(
                    'rounded-[11px] bg-card p-4 sm:p-5',
                    innerClassName
                ) }
            >
                { children }
            </div>
        </div>
    );
}

/**
 * A ready-made insight: badge + typed sentence (+ optional action on the
 * right), with anything below it in `children`. `children` can be a function
 * that receives `revealed` to start its own animations once the panel has
 * "thought".
 * @param root0
 * @param root0.text
 * @param root0.action
 * @param root0.children
 * @param root0.className
 */
export function InsightCallout( {
    text,
    action,
    children,
    className,
}: {
    text: string;
    action?: React.ReactNode;
    children?: React.ReactNode | ( ( revealed: boolean ) => React.ReactNode );
    className?: string;
} ) {
    const { phase, shown } = useTypewriter( text );
    const revealed = phase !== 'thinking';

    return (
        <InsightFrame className={ className } innerClassName="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                    <InsightBadge animating={ phase !== 'done' } />
                    <InsightText
                        text={ text }
                        phase={ phase }
                        shown={ shown }
                    />
                </div>
                { action ?? null }
            </div>
            { typeof children === 'function'
                ? children( revealed )
                : children ?? null }
        </InsightFrame>
    );
}

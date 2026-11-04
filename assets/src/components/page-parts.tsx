import * as React from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Search } from 'lucide-react';

import { Card } from './ui/card';
import { buttonVariants } from './ui/button';
import { TabsList, TabsTrigger } from './ui/tabs';
import { cn } from './utils';

// Building blocks shared by the list pages (Subscribers, Segments, Campaigns)
// so they match the Dashboard and Analytics look. Ported from the app's
// resources/js/Components/Page/page-parts.tsx; keep the class names in sync.

export function PageHeader( {
    title,
    description,
    actions,
}: {
    title: string;
    description: React.ReactNode;
    actions?: React.ReactNode;
} ) {
    return (
        <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
                <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    { title }
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    { description }
                </p>
            </div>
            { actions ? (
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    { actions }
                </div>
            ) : null }
        </header>
    );
}

export function SectionCard( {
    title,
    description,
    actions,
    footer,
    children,
    className,
    testId,
}: {
    title: string;
    description?: React.ReactNode;
    actions?: React.ReactNode;
    footer?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    testId?: string;
} ) {
    return (
        <Card
            data-testid={ testId }
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                        { title }
                    </h2>
                    { description ? (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            { description }
                        </p>
                    ) : null }
                </div>
                { actions ? (
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                        { actions }
                    </div>
                ) : null }
            </div>
            { children }
            { footer ? (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    { footer }
                </div>
            ) : null }
        </Card>
    );
}

export function EmptyState( {
    icon,
    title,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    children?: React.ReactNode;
} ) {
    return (
        <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-16 text-center">
            <span
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                aria-hidden
            >
                { icon }
            </span>
            <h3 className="font-semibold text-foreground">{ title }</h3>
            { children }
        </div>
    );
}

export type ChipTone =
    | 'success'
    | 'danger'
    | 'warning'
    | 'primary'
    | 'violet'
    | 'neutral';

const CHIP_TONES: Record< ChipTone, string > = {
    success:
        'bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400',
    danger: 'bg-red-600/10 text-red-700 dark:bg-red-400/10 dark:text-red-400',
    warning:
        'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-400',
    primary: 'bg-primary/10 text-primary',
    violet: 'bg-violet-500/10 text-violet-700 dark:bg-violet-400/10 dark:text-violet-300',
    neutral: 'bg-muted text-muted-foreground',
};

const DOT_TONES: Record< ChipTone, string > = {
    success: 'bg-emerald-600 dark:bg-emerald-400',
    danger: 'bg-red-600 dark:bg-red-400',
    warning: 'bg-amber-500 dark:bg-amber-400',
    primary: 'bg-primary',
    violet: 'bg-violet-500 dark:bg-violet-400',
    neutral: 'bg-muted-foreground/50',
};

/**
 * A small rounded status or label chip, with a leading dot or icon.
 * @param root0
 * @param root0.tone
 * @param root0.icon
 * @param root0.dot
 * @param root0.pulse
 * @param root0.className
 * @param root0.children
 */
export function Chip( {
    tone = 'neutral',
    icon,
    dot = false,
    pulse = false,
    className,
    children,
}: {
    tone?: ChipTone;
    icon?: React.ReactNode;
    dot?: boolean;
    pulse?: boolean;
    className?: string;
    children: React.ReactNode;
} ) {
    return (
        <span
            className={ cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold',
                CHIP_TONES[ tone ],
                className
            ) }
        >
            { dot ? (
                <span
                    className={ cn(
                        'h-1.5 w-1.5 rounded-full',
                        DOT_TONES[ tone ],
                        pulse ? 'animate-pulse' : null
                    ) }
                    aria-hidden
                />
            ) : null }
            { icon }
            { children }
        </span>
    );
}

/**
 * Search box sized for a page or card toolbar.
 * @param root0
 * @param root0.value
 * @param root0.onChange
 * @param root0.placeholder
 * @param root0.label
 * @param root0.className
 */
export function SearchInput( {
    value,
    onChange,
    placeholder,
    label,
    className,
}: {
    value: string;
    onChange: ( value: string ) => void;
    placeholder: string;
    label: string;
    className?: string;
} ) {
    return (
        <div className={ cn( 'relative w-full sm:w-64', className ) }>
            <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
            />
            <input
                type="search"
                aria-label={ label }
                placeholder={ placeholder }
                className="flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 pl-9 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={ value }
                onChange={ ( event ) => {
                    onChange( event.target.value );
                } }
            />
        </div>
    );
}

/**
 * Previous / Next buttons for a cursor-paginated list. The app's
 * CursorPagination builds Inertia links; the plugin keeps its cursor in
 * component state, so this one only renders the buttons and reports clicks.
 * @param root0
 * @param root0.hasPrevious
 * @param root0.hasNext
 * @param root0.onPrevious
 * @param root0.onNext
 * @param root0.label
 * @param root0.disabled
 */
export function CursorPager( {
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    label,
    disabled = false,
}: {
    hasPrevious: boolean;
    hasNext: boolean;
    onPrevious: () => void;
    onNext: () => void;
    label: string;
    disabled?: boolean;
} ) {
    const classes = cn(
        buttonVariants( { variant: 'outline', size: 'sm' } ),
        'gap-1'
    );

    return (
        <nav aria-label={ label } className="flex gap-2">
            <button
                type="button"
                className={ classes }
                disabled={ disabled || ! hasPrevious }
                onClick={ () => {
                    onPrevious();
                } }
            >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
            </button>
            <button
                type="button"
                className={ classes }
                disabled={ disabled || ! hasNext }
                onClick={ () => {
                    onNext();
                } }
            >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
        </nav>
    );
}

/**
 * Pill-style segmented control, as used for the Analytics time range.
 * @param root0
 * @param root0.value
 * @param root0.options
 * @param root0.onChange
 * @param root0.label
 */
export function SegmentedControl< T extends string >( {
    value,
    options,
    onChange,
    label,
}: {
    value: T;
    options: { key: T; label: string; count?: number }[];
    onChange: ( next: T ) => void;
    label: string;
} ) {
    return (
        <div
            role="group"
            aria-label={ label }
            className="flex max-w-full gap-0.5 overflow-x-auto rounded-lg bg-muted p-1"
        >
            { options.map( ( option ) => (
                <button
                    key={ option.key }
                    type="button"
                    aria-pressed={ option.key === value }
                    onClick={ () => {
                        onChange( option.key );
                    } }
                    className={ cn(
                        'h-8 min-w-12 shrink-0 whitespace-nowrap rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        option.key === value
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    ) }
                >
                    { option.label }
                    { option.count !== undefined ? (
                        <span
                            className={ cn(
                                'ml-1.5 rounded-full px-1.5 text-xs tabular-nums',
                                option.key === value
                                    ? 'bg-primary/10 text-primary'
                                    : 'bg-background/60 text-muted-foreground'
                            ) }
                        >
                            { option.count }
                        </span>
                    ) : null }
                </button>
            ) ) }
        </div>
    );
}

/**
 * The segmented control's look for page-level navigation between routes.
 * @param root0
 * @param root0.items
 * @param root0.label
 */
export function SegmentedLinks( {
    items,
    label,
}: {
    items: { to: string; label: string; active: boolean }[];
    label: string;
} ) {
    return (
        <nav
            aria-label={ label }
            className="flex gap-0.5 rounded-lg bg-muted p-1"
        >
            { items.map( ( item ) => (
                <Link
                    key={ item.to }
                    to={ item.to }
                    aria-current={ item.active ? 'page' : undefined }
                    className={ cn(
                        'inline-flex h-8 items-center rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                        item.active
                            ? 'bg-card text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    ) }
                >
                    { item.label }
                </Link>
            ) ) }
        </nav>
    );
}

export type Step = {
    value: string;
    label: string;
    icon: React.ReactNode;
    disabled?: boolean;
};

/**
 * Tabs drawn as a numbered stepper (campaign and segment editors). Must sit
 * inside <Tabs>.
 * On small screens only the current step shows its label.
 * @param root0
 * @param root0.steps
 * @param root0.active
 */
export function StepTabs( {
    steps,
    active,
}: {
    steps: Step[];
    active: string;
} ) {
    const activeIndex = Math.max(
        0,
        steps.findIndex( ( step ) => step.value === active )
    );

    return (
        <TabsList className="flex h-auto w-full items-center justify-start gap-1.5 rounded-xl sm:gap-2 border border-border bg-card p-2 shadow-sm">
            { steps.map( ( step, index ) => {
                const isActive = index === activeIndex;
                const isDone = index < activeIndex;

                return (
                    <React.Fragment key={ step.value }>
                        { index > 0 ? (
                            <span
                                className={ cn(
                                    'h-px min-w-3 flex-1',
                                    isDone || isActive
                                        ? 'bg-primary/40'
                                        : 'bg-border'
                                ) }
                                aria-hidden
                            />
                        ) : null }
                        <TabsTrigger
                            value={ step.value }
                            disabled={ step.disabled }
                            className="group gap-2.5 rounded-lg px-1.5 py-1.5 sm:px-2.5 text-sm font-semibold text-muted-foreground shadow-none transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
                        >
                            <span
                                className={ cn(
                                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : null,
                                    isDone
                                        ? 'bg-emerald-600 text-white dark:bg-emerald-500'
                                        : null,
                                    ! isActive && ! isDone
                                        ? 'bg-muted text-muted-foreground'
                                        : null
                                ) }
                                aria-hidden
                            >
                                { isDone ? (
                                    <Check className="h-3.5 w-3.5" />
                                ) : (
                                    index + 1
                                ) }
                            </span>
                            <span
                                className={ cn(
                                    'items-center gap-1.5',
                                    isActive ? 'flex' : 'hidden sm:flex'
                                ) }
                            >
                                <span
                                    className="[&>svg]:h-4 [&>svg]:w-4"
                                    aria-hidden
                                >
                                    { step.icon }
                                </span>
                                { step.label }
                            </span>
                        </TabsTrigger>
                    </React.Fragment>
                );
            } ) }
        </TabsList>
    );
}

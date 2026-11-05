import { useState } from 'react';
import type { ReactNode } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { SectionCard, SegmentedControl } from '../page-parts';
import { Label } from '../ui/label';
import { RadioGroupItem } from '../ui/radio-group';
import { cn } from '../utils';
import { BILLING_URL } from '../../lib/app';
import ChromeMac from './previews/ChromeMac';
import ChromeWindows from './previews/ChromeWindows';
import FirefoxMac from './previews/FirefoxMac';
import FirefoxWindows from './previews/FirefoxWindows';
import SafariMac from './previews/SafariMac';

// Shared look for the campaign composer. Ported from the app's
// resources/js/Components/Notifications/composer-parts.tsx.

type Platform = 'mac' | 'windows';

/**
 * Live previews of the notification, one platform at a time.
 *
 * @param root0         Component props.
 * @param root0.title   Notification title.
 * @param root0.message Notification message.
 * @param root0.icon    Icon URL, or null for the default bell.
 */
export function ComposerPreview( {
    title,
    message,
    icon,
}: {
    title: string;
    message: string;
    icon?: string | null;
} ) {
    const [ platform, setPlatform ] = useState< Platform >( 'mac' );
    const shared = {
        classes: 'mb-6 last:mb-0',
        title,
        message,
        icon: icon ?? undefined,
    };

    return (
        <SectionCard
            title="Notification Preview"
            description="How it looks on your subscribers' screens"
            className="lg:sticky lg:top-12"
            actions={
                <SegmentedControl
                    value={ platform }
                    onChange={ setPlatform }
                    label="Preview platform"
                    options={ [
                        { key: 'mac', label: 'macOS' },
                        { key: 'windows', label: 'Windows' },
                    ] }
                />
            }
        >
            <div className="mt-5">
                { platform === 'mac' ? (
                    <>
                        <ChromeMac cardTitle="Chrome" { ...shared } />
                        <FirefoxMac cardTitle="Firefox" { ...shared } />
                        <SafariMac cardTitle="Safari" { ...shared } />
                    </>
                ) : (
                    <>
                        <ChromeWindows cardTitle="Chrome" { ...shared } />
                        <FirefoxWindows cardTitle="Firefox" { ...shared } />
                    </>
                ) }
            </div>
        </SectionCard>
    );
}

/** Class names for a selectable option row inside a Radix RadioGroup. */
export const CHOICE_ROW =
    'relative flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5 transition-colors hover:border-primary/50 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5';

export function ChoiceIcon( { children }: { children: ReactNode } ) {
    return (
        <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:h-4 [&>svg]:w-4"
            aria-hidden
        >
            { children }
        </span>
    );
}

/**
 * One "When to send" option. `locked` means the plan does not include it:
 * the card stays visible but cannot be picked (the server would refuse it).
 *
 * @param root0             Component props.
 * @param root0.value       Radio value, also used as the input id.
 * @param root0.title       Option name.
 * @param root0.description Short explanation shown when unlocked.
 * @param root0.icon        Option icon.
 * @param root0.selected    Whether this option is the current choice.
 * @param root0.locked      Whether the plan excludes this option.
 */
export function SendOptionCard( {
    value,
    title,
    description,
    icon,
    selected,
    locked = false,
}: {
    value: string;
    title: string;
    description: string;
    icon: ReactNode;
    selected: boolean;
    locked?: boolean;
} ) {
    return (
        <div
            className={ cn(
                'relative flex items-center gap-4 rounded-xl border bg-card p-4 transition-colors',
                locked
                    ? 'cursor-not-allowed border-dashed border-border bg-muted/40'
                    : null,
                ! locked && selected ? 'border-primary bg-primary/5' : null,
                ! locked && ! selected
                    ? 'cursor-pointer border-border hover:border-primary/50'
                    : null
            ) }
        >
            <RadioGroupItem
                value={ value }
                id={ value }
                disabled={ locked }
                className="sr-only"
            />
            <span
                className={ cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg [&>svg]:h-5 [&>svg]:w-5',
                    selected && ! locked
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                ) }
                aria-hidden
            >
                { icon }
            </span>
            <div className="min-w-0">
                <span
                    className={ cn(
                        'flex items-center gap-1.5 text-sm font-medium',
                        locked ? 'text-muted-foreground' : 'text-foreground'
                    ) }
                >
                    { title }
                    { locked ? (
                        <Lock className="h-3.5 w-3.5" aria-hidden />
                    ) : null }
                </span>
                <p className="text-xs text-muted-foreground">
                    { locked ? 'Not included in your plan' : description }
                </p>
            </div>
            { locked ? null : (
                <Label
                    htmlFor={ value }
                    className="absolute inset-0 cursor-pointer rounded-xl"
                >
                    <span className="sr-only">{ title }</span>
                </Label>
            ) }
        </div>
    );
}

/**
 * Shown under the send options when the plan locks one or more of them.
 *
 * @param root0        Component props.
 * @param root0.locked Names of the locked options, such as "Scheduled sends".
 */
export function SendOptionsUpgrade( { locked }: { locked: string[] } ) {
    if ( locked.length === 0 ) {
        return null;
    }

    return (
        <div className="flex flex-col gap-3 rounded-xl border border-violet-500/30 bg-violet-500/5 p-4 sm:flex-row sm:items-center">
            <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600"
                aria-hidden
            >
                <Sparkles className="h-4 w-4" />
            </span>
            <p className="min-w-0 flex-1 text-sm text-foreground">
                { locked.join( ' and ' ) } are not included in your plan.
                Upgrade to schedule sends ahead of time.
            </p>
            <a
                href={ BILLING_URL }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 hover:text-white"
            >
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Upgrade plan
            </a>
        </div>
    );
}

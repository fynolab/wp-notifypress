import type { ReactNode } from 'react';
import {
    ArrowRight,
    Bell,
    Clock,
    Tag,
    Webhook,
    Workflow,
    Zap,
} from 'lucide-react';

import { Chip } from '../page-parts';
import type { AutomationTemplate } from '../../types';

// One pre-built automation in the templates gallery. Ported from the app's
// resources/js/Pages/Automations/Templates/components/TemplateCard.tsx.

const STEP_ICONS: Record< string, ReactNode > = {
    wait: <Clock className="h-3.5 w-3.5" aria-hidden />,
    send_notification: <Bell className="h-3.5 w-3.5" aria-hidden />,
    add_tag: <Tag className="h-3.5 w-3.5" aria-hidden />,
    webhook: <Webhook className="h-3.5 w-3.5" aria-hidden />,
};

/**
 * @param root0
 * @param root0.template    The template to show.
 * @param root0.onClick     Opens the preview.
 * @param root0.showPopular Marks popular templates (only in the All view).
 */
export function TemplateCard( {
    template,
    onClick,
    showPopular = false,
}: {
    template: AutomationTemplate;
    onClick: () => void;
    showPopular?: boolean;
} ) {
    const sends = template.steps.filter(
        ( step ) => step.type === 'send_notification'
    ).length;
    const stepCount = template.steps.length;

    return (
        <button
            type="button"
            onClick={ onClick }
            className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <div className="flex w-full items-start justify-between gap-3">
                <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    aria-hidden
                >
                    { template.is_custom_event ? (
                        <Zap className="h-5 w-5" />
                    ) : (
                        <Workflow className="h-5 w-5" />
                    ) }
                </span>
                { showPopular && template.category === 'popular' ? (
                    <Chip tone="violet">Popular</Chip>
                ) : null }
            </div>
            <h3 className="mt-4 font-display text-base font-semibold text-foreground">
                { template.name }
            </h3>
            <p className="mb-4 mt-1 text-sm leading-relaxed text-muted-foreground">
                { template.description }
            </p>
            <div className="mt-auto flex w-full items-center justify-between gap-2 border-t border-border pt-3.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1" aria-label="Steps">
                    { template.steps.map( ( step, index ) => (
                        <span
                            key={ index }
                            className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground"
                            title={ step.type.replace( '_', ' ' ) }
                        >
                            { STEP_ICONS[ step.type ] ?? null }
                        </span>
                    ) ) }
                </span>
                <span className="whitespace-nowrap">
                    { stepCount } { stepCount === 1 ? 'step' : 'steps' }
                    { sends > 0
                        ? ` · ${ sends } ${ sends === 1 ? 'push' : 'pushes' }`
                        : '' }
                </span>
            </div>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                Preview
                <ArrowRight
                    className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                />
            </span>
        </button>
    );
}

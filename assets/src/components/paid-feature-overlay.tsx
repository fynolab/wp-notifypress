import { Lock, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { BILLING_URL } from '../lib/app';

type Props = {
    isPaidUser: boolean;
    featureName: string;
    description: string;
    children: ReactNode;
};

/**
 * Shared "browsable but locked" upgrade gate — mirrors the main app's
 * resources/js/Components/PaidFeatureOverlay.tsx (same markup/classes, verified compatible
 * with this plugin's Tailwind config). Paid users see `children` unmodified.
 *
 * @param {Object}              props             Component props.
 * @param {boolean}             props.isPaidUser  Whether the connected site's plan unlocks this feature.
 * @param {string}              props.featureName Feature name shown in the upgrade copy, e.g. "Segments".
 * @param {string}              props.description Explanation of what the upgrade unlocks.
 * @param {ReactNode}           props.children    The gated content, blurred and non-interactive for free users.
 * @return {JSX.Element} The gated content, or an upgrade banner + blurred/locked content for free users.
 */
export default function PaidFeatureOverlay( {
    isPaidUser,
    featureName,
    description,
    children,
}: Props ) {
    if ( isPaidUser ) {
        return <>{ children }</>;
    }

    const upgradeHref = BILLING_URL;

    return (
        <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-xl border border-violet-500/30 bg-violet-500/5 p-5">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500/10">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                        Upgrade to unlock { featureName }
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        { description }
                    </p>
                </div>
                <a
                    href={ upgradeHref }
                    className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-md bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow transition-colors hover:bg-violet-700"
                >
                    <Lock className="h-3 w-3" />
                    Upgrade Plan
                </a>
            </div>

            <div className="relative">
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 rounded-xl bg-background/60 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2 px-4 text-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/10">
                            <Lock className="h-5 w-5 text-violet-500" />
                        </div>
                        <p className="text-sm font-semibold text-foreground">
                            { featureName } is a paid feature
                        </p>
                        <p className="max-w-xs text-xs text-muted-foreground">
                            { description }
                        </p>
                        <a
                            href={ upgradeHref }
                            className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow transition-colors hover:bg-violet-700"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            Upgrade Plan
                        </a>
                    </div>
                </div>

                <div className="pointer-events-none select-none blur-sm">
                    { children }
                </div>
            </div>
        </div>
    );
}

import { Link } from 'react-router-dom';
import { BellRing, Check } from 'lucide-react';

/**
 * Shown in place of the stat cards until the site has its first subscriber.
 * The plugin adds the opt-in prompt to the site by itself, so step two is
 * checking how that prompt looks rather than installing anything.
 *
 * @param props          Component props.
 * @param props.siteName The connected site's name, if known.
 */
export function GettingStarted( { siteName }: { siteName: string | null } ) {
    return (
        <section
            aria-labelledby="np-getting-started-title"
            className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
        >
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2
                        id="np-getting-started-title"
                        className="text-xl font-semibold text-foreground"
                    >
                        Get set up in three steps
                    </h2>
                    <p className="mt-1 text-muted-foreground">
                        Your dashboard fills in as soon as visitors start
                        subscribing.
                    </p>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <span>1 of 3 done</span>
                    <div
                        className="h-1.5 w-28 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label="Setup progress"
                        aria-valuemin={ 0 }
                        aria-valuemax={ 3 }
                        aria-valuenow={ 1 }
                    >
                        <div className="h-full w-1/3 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    </div>
                </div>
            </div>

            <ol className="mt-5">
                <li className="flex gap-3.5 border-t border-border py-4">
                    <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400"
                        aria-hidden
                    >
                        <Check className="h-4 w-4" strokeWidth={ 2.6 } />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="mt-1 font-semibold text-foreground">
                            Connect your site{ ' ' }
                            <span className="font-normal text-muted-foreground">
                                · Done
                            </span>
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                            { siteName
                                ? `${ siteName } is connected to NotifyPress.`
                                : 'Your site is connected to NotifyPress.' }
                        </p>
                    </div>
                </li>
                <li className="flex gap-3.5 border-t border-border py-4">
                    <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground"
                        aria-hidden
                    >
                        2
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="mt-1 font-semibold text-foreground">
                            Check your opt-in prompt
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                            The plugin already shows it to your visitors. Make
                            sure the wording and timing suit your site.
                        </p>
                        <Link
                            to="/settings?tab=optin"
                            className="mt-3 inline-flex h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:text-primary-foreground"
                        >
                            <BellRing className="h-4 w-4" aria-hidden />
                            Review the prompt
                        </Link>
                    </div>
                </li>
                <li className="flex gap-3.5 border-t border-border pt-4">
                    <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border font-bold text-muted-foreground"
                        aria-hidden
                    >
                        3
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="mt-1 font-semibold text-foreground">
                            Send your first campaign
                        </p>
                        <p className="mt-0.5 text-muted-foreground">
                            It reaches people once your first visitor
                            subscribes. You can write a draft now.
                        </p>
                        <Link
                            to="/notifications/new"
                            className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary hover:underline"
                        >
                            Write a draft
                        </Link>
                    </div>
                </li>
            </ol>
        </section>
    );
}

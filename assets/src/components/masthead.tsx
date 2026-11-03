import { BookOpen, LifeBuoy } from 'lucide-react';
import LogoMark from './logo-mark';
import AnnouncementsBell from './announcements-bell';

export default function Masthead() {
    return (
        <div className="flex items-center justify-between border-b bg-content-bg px-4 py-3 md:px-6">
            <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                    <LogoMark className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold text-foreground">
                    NotifyPress
                </span>
            </div>

            <div className="flex items-center gap-1">
                <a
                    href="https://notifypress.com/docs"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <BookOpen className="h-4 w-4" />
                    Docs
                </a>
                <a
                    href="https://notifypress.com/contact?utm_source=plugin"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    <LifeBuoy className="h-4 w-4" />
                    Support
                </a>
                <AnnouncementsBell />
            </div>
        </div>
    );
}

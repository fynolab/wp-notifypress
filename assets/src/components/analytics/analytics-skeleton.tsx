import { Card } from '../ui/card';

function SkeletonCard( { className }: { className?: string } ) {
    return (
        <Card
            className={ `border-border bg-card p-5 shadow-sm sm:p-6 ${
                className ?? ''
            }` }
        >
            <div className="h-5 w-32 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-4 w-52 animate-pulse rounded bg-muted/70" />
            <div className="mt-6 h-44 animate-pulse rounded-lg bg-muted/60" />
        </Card>
    );
}

/**
 * Placeholder shown until the first analytics response arrives, so a Free
 * user never sees unlocked zeros before the server says which plan they are on.
 */
export function AnalyticsSkeleton() {
    return (
        <div
            className="space-y-6"
            role="status"
            aria-busy="true"
            aria-label="Loading analytics"
        >
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                { [ 0, 1, 2, 3 ].map( ( index ) => (
                    <div
                        key={ index }
                        className="h-32 animate-pulse rounded-xl border border-border bg-card"
                    />
                ) ) }
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                <SkeletonCard className="xl:col-span-3" />
                <SkeletonCard className="xl:col-span-2" />
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                <SkeletonCard className="xl:col-span-3" />
                <SkeletonCard className="xl:col-span-2" />
            </div>
        </div>
    );
}

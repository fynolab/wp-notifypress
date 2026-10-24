import { Card } from '../ui/card';
import PaidFeatureOverlay from '../paid-feature-overlay';

const BARS = [ 40, 65, 50, 80, 55, 90, 70, 45, 85, 60 ];

function PlaceholderCard( { className }: { className: string } ) {
    return (
        <Card
            className={ `border-border bg-card p-5 shadow-sm sm:p-6 ${ className }` }
        >
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="mt-2 h-4 w-52 rounded bg-muted/70" />
            <div className="mt-6 flex h-52 items-end gap-2" aria-hidden>
                { BARS.map( ( height, index ) => (
                    <div
                        key={ index }
                        className="flex-1 rounded-t bg-primary/20"
                        style={ { height: `${ height }%` } }
                    />
                ) ) }
            </div>
        </Card>
    );
}

/**
 * Static placeholders for the chart rows, shown to Free users under the shared
 * upgrade overlay. No real data is rendered, the server does not send any.
 */
export function LockedSection() {
    return (
        <div data-testid="analytics-locked">
            <PaidFeatureOverlay
                isPaidUser={ false }
                featureName="analytics charts"
                description="Engagement charts, delivery funnel, best send times, country and segment insights and the campaign table are on every paid plan, starting with Starter."
            >
                <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <PlaceholderCard className="xl:col-span-3" />
                        <PlaceholderCard className="xl:col-span-2" />
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <PlaceholderCard className="xl:col-span-3" />
                        <PlaceholderCard className="xl:col-span-2" />
                    </div>
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-5">
                        <PlaceholderCard className="xl:col-span-3" />
                        <PlaceholderCard className="xl:col-span-2" />
                    </div>
                    <PlaceholderCard className="" />
                </div>
            </PaidFeatureOverlay>
        </div>
    );
}

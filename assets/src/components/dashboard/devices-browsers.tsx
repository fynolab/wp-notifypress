import { Card } from '../ui/card';
import { cn } from '../utils';
import type { DashboardShareRow } from '../../types';

// Device shades step down in lightness so they stay distinct without colour.
const DEVICE_SHADES = [
    'bg-primary',
    'bg-primary/55',
    'bg-primary/25',
    'bg-muted-foreground/40',
];

export function DevicesBrowsers( {
    devices,
    browsers,
    className,
}: {
    devices: DashboardShareRow[];
    browsers: DashboardShareRow[];
    className?: string;
} ) {
    return (
        <Card
            className={ cn(
                'border-border bg-card p-5 shadow-sm sm:p-6',
                className
            ) }
        >
            <h2 className="text-lg font-semibold text-foreground">
                Devices and browsers
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
                Where your active subscribers get your pushes
            </p>

            { 0 === devices.length ? (
                <p className="mt-6 text-sm text-muted-foreground">
                    No data yet.
                </p>
            ) : (
                <>
                    <div
                        className="mt-5 flex h-3 gap-0.5 overflow-hidden rounded-full"
                        aria-hidden
                    >
                        { devices.map( ( device, index ) => (
                            <div
                                key={ device.name }
                                className={
                                    DEVICE_SHADES[
                                        index % DEVICE_SHADES.length
                                    ]
                                }
                                style={ { width: `${ device.percentage }%` } }
                            />
                        ) ) }
                    </div>
                    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                        { devices.map( ( device, index ) => (
                            <li
                                key={ device.name }
                                className="flex items-center gap-1.5 text-sm text-foreground"
                            >
                                <span
                                    className={ cn(
                                        'h-2.5 w-2.5 rounded-sm',
                                        DEVICE_SHADES[
                                            index % DEVICE_SHADES.length
                                        ]
                                    ) }
                                    aria-hidden
                                />
                                { device.name }
                                <span className="font-semibold">
                                    { device.percentage }%
                                </span>
                            </li>
                        ) ) }
                    </ul>

                    <ul className="mt-5 space-y-3 border-t border-border pt-4">
                        { browsers.map( ( browser ) => (
                            <li key={ browser.name }>
                                <div className="flex justify-between gap-2 text-sm text-foreground">
                                    <span>{ browser.name }</span>
                                    <span className="font-semibold">
                                        { browser.percentage }%
                                    </span>
                                </div>
                                <div
                                    className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                                    aria-hidden
                                >
                                    <div
                                        className="h-full rounded-full bg-primary/60"
                                        style={ {
                                            width: `${ browser.percentage }%`,
                                        } }
                                    />
                                </div>
                            </li>
                        ) ) }
                    </ul>
                </>
            ) }
        </Card>
    );
}

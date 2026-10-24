import type { AnalyticsRange } from '../../types';

export const ANALYTICS_RANGES: {
    key: AnalyticsRange;
    label: string;
    long: string;
}[] = [
    { key: '30d', label: '30 days', long: '30 days' },
    { key: '90d', label: '90 days', long: '90 days' },
    { key: '12m', label: '12 months', long: '12 months' },
];

export function rangeLabel( range: AnalyticsRange ): string {
    return (
        ANALYTICS_RANGES.find( ( option ) => option.key === range )?.long ??
        '30 days'
    );
}

export const MINUTE = 1;
export const HOUR = 60;
export const DAY = 1440;
export const MONTH = 43200; // 30-day month, matches server-side max (delay_minutes: 1-43200)

export interface WaitUnits {
    months: number;
    days: number;
    hours: number;
    minutes: number;
}

export function minutesToUnits( total: number ): WaitUnits {
    let remaining = Math.max( 0, total );
    const months = Math.floor( remaining / MONTH );
    remaining %= MONTH;
    const days = Math.floor( remaining / DAY );
    remaining %= DAY;
    const hours = Math.floor( remaining / HOUR );
    remaining %= HOUR;
    return { months, days, hours, minutes: remaining };
}

export function unitsToMinutes( units: WaitUnits ): number {
    const total =
        units.months * MONTH +
        units.days * DAY +
        units.hours * HOUR +
        units.minutes;
    return Math.min( MONTH, Math.max( MINUTE, total ) );
}

// Formatting shared by the dashboard cards. Instants are shown in the browser
// timezone, bucket keys as plain calendar days.

import { parseInstant, parseLocalDay } from '../../lib/format';

export function toNumber( value?: string | number | null ): number {
    const number = Number( String( value ?? 0 ).replace( /,/g, '' ) );

    return Number.isFinite( number ) ? number : 0;
}

export function formatCount( value: number ): string {
    if ( Math.abs( value ) >= 100_000 ) {
        return Intl.NumberFormat( 'en', {
            notation: 'compact',
            maximumFractionDigits: 1,
        } ).format( value );
    }

    return value.toLocaleString();
}

export function formatSigned( value: number ): string {
    if ( value > 0 ) {
        return `+${ formatCount( value ) }`;
    }

    if ( value < 0 ) {
        return `−${ formatCount( Math.abs( value ) ) }`;
    }

    return '0';
}

export function formatRelativeDate( date?: string | null ): string {
    if ( ! date ) {
        return '';
    }

    const parsed = parseInstant( date );

    if ( ! parsed ) {
        return '';
    }

    const target = parsed.getTime();

    const diffMinutes = Math.round( ( target - Date.now() ) / 60000 );
    const formatter = new Intl.RelativeTimeFormat( 'en', { numeric: 'auto' } );

    if ( Math.abs( diffMinutes ) < 60 ) {
        return formatter.format( diffMinutes, 'minute' );
    }

    const diffHours = Math.round( diffMinutes / 60 );

    if ( Math.abs( diffHours ) < 24 ) {
        return formatter.format( diffHours, 'hour' );
    }

    return formatter.format( Math.round( diffHours / 24 ), 'day' );
}

export function formatDateTime( date?: string | null ): string {
    if ( ! date ) {
        return '';
    }

    const parsed = parseInstant( date );

    if ( ! parsed ) {
        return '';
    }

    return new Intl.DateTimeFormat( undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    } ).format( parsed );
}

// "2026-10-23" (a local calendar day from the API) as "Oct 23", with no
// timezone shifting.
export function formatDay( day: string ): string {
    const parsed = parseLocalDay( day );

    if ( ! parsed ) {
        return day;
    }

    return new Intl.DateTimeFormat( undefined, {
        month: 'short',
        day: 'numeric',
    } ).format( parsed );
}

// "2026-10-01" (the start of a local month from the API) as "Oct 2026", or just
// "Oct" when `withYear` is false, with no timezone shifting.
export function formatMonth( day: string, withYear = true ): string {
    const parsed = parseLocalDay( day );

    if ( ! parsed ) {
        return day;
    }

    return new Intl.DateTimeFormat( undefined, {
        month: 'short',
        year: withYear ? 'numeric' : undefined,
    } ).format( parsed );
}

// A send time with the year, so rows older than this year stay unambiguous.
export function formatSentAt( date?: string | null ): string {
    if ( ! date ) {
        return '—';
    }

    const parsed = parseInstant( date );

    if ( ! parsed ) {
        return '—';
    }

    return new Intl.DateTimeFormat( undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    } ).format( parsed );
}

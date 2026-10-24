// Formatting shared by the dashboard cards.

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

    const target = new Date( date ).getTime();

    if ( Number.isNaN( target ) ) {
        return '';
    }

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

    const parsed = new Date( date );

    if ( Number.isNaN( parsed.getTime() ) ) {
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

// "2026-10-23" (a UTC day from the API) as "Oct 23", without shifting it a day
// for viewers west of UTC.
export function formatDay( day: string ): string {
    const [ year, month, date ] = day.split( '-' ).map( Number );

    return new Intl.DateTimeFormat( undefined, {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    } ).format( new Date( Date.UTC( year, month - 1, date ) ) );
}

// "2026-10-01" (the start of a UTC month from the API) as "Oct 2026", or just
// "Oct" when `withYear` is false, without shifting it for viewers west of UTC.
export function formatMonth( day: string, withYear = true ): string {
    const [ year, month, date ] = day.split( '-' ).map( Number );

    return new Intl.DateTimeFormat( undefined, {
        month: 'short',
        year: withYear ? 'numeric' : undefined,
        timeZone: 'UTC',
    } ).format( new Date( Date.UTC( year, month - 1, date ) ) );
}

// A send time with the year, so rows older than this year stay unambiguous.
export function formatSentAt( date?: string | null ): string {
    if ( ! date ) {
        return '—';
    }

    const parsed = new Date( date );

    if ( Number.isNaN( parsed.getTime() ) ) {
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

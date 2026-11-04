export const formatNumber = ( value?: string | number | null ) => {
    const number = Number( String( value ).replace( /,/g, '' ) );

    if ( Number.isNaN( number ) ) {
        return value || '0';
    }

    return new Intl.NumberFormat( 'en', {
        notation: 'compact',
        maximumFractionDigits: 1,
    } ).format( number );
};

export const formatDate = ( value?: string | null ) => {
    if ( ! value ) {
        return '—';
    }

    const date = new Date( value );

    if ( Number.isNaN( date.getTime() ) ) {
        return value;
    }

    return new Intl.DateTimeFormat( 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    } ).format( date );
};

// The API stores schedules as wall-clock "Y-m-d H:i:s" (no timezone). Read
// it as local time, with a "T" so Safari parses it too.
const parseScheduleValue = ( value: string ) =>
    new Date( value.includes( 'T' ) ? value : value.replace( ' ', 'T' ) );

export const formatDateInput = ( value?: string | null ) => {
    if ( ! value ) {
        return '';
    }

    const date = parseScheduleValue( value );

    if ( Number.isNaN( date.getTime() ) ) {
        return '';
    }

    // Local date parts: toISOString() is UTC and moved evening times to the
    // next day.
    return `${ date.getFullYear() }-${ String( date.getMonth() + 1 ).padStart(
        2,
        '0'
    ) }-${ String( date.getDate() ).padStart( 2, '0' ) }`;
};

export const formatTimeInput = ( value?: string | null ) => {
    if ( ! value ) {
        return '';
    }

    const date = parseScheduleValue( value );

    if ( Number.isNaN( date.getTime() ) ) {
        return '';
    }

    return `${ String( date.getHours() ).padStart( 2, '0' ) }:${ String(
        date.getMinutes()
    ).padStart( 2, '0' ) }`;
};

export const toScheduleTimestamp = (
    dateValue?: string,
    timeValue?: string
) => {
    if ( ! dateValue || ! timeValue ) {
        return '';
    }

    return `${ dateValue } ${ timeValue }:00`;
};

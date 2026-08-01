export const ui = {
    page: 'container mx-auto px-4 py-8 space-y-8',
    gridDetail: 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]',
    card: 'rounded-xl border border-border bg-card text-card-foreground shadow',
    cardPadded:
        'rounded-xl border border-border bg-card p-6 text-card-foreground shadow',
    toolbar:
        'flex flex-col gap-4 rounded-xl border border-border bg-card p-6 text-card-foreground shadow md:flex-row md:items-center md:justify-between',
    tableWrap:
        'overflow-hidden rounded-xl border border-dashed border-border bg-card text-card-foreground shadow',
    tableScroll: 'overflow-x-auto',
    table: 'w-full border-collapse text-left text-sm',
    th: 'h-10 px-2 text-left align-middle font-medium text-muted-foreground',
    td: 'p-2 align-middle',
    emptyTd: 'px-4 py-10 text-center text-sm text-muted-foreground',
    label: 'text-sm font-medium text-foreground',
    input: 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
    textarea:
        'min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors placeholder:text-muted-foreground focus:border-primary focus:shadow-sm focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
    select: 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus:border-primary focus:outline-none',
    primaryButton:
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50',
    secondaryButton:
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
    ghostButton:
        'inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
    dangerButton:
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground shadow transition-colors hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50',
    linkButton:
        'text-sm font-semibold text-primary hover:text-primary/80 disabled:pointer-events-none disabled:opacity-50',
    kicker: 'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
    heading: 'text-2xl font-bold tracking-tight text-foreground',
    subtext: 'text-sm text-muted-foreground',
    badge: 'inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground',
    badgeSuccess:
        'inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700',
    badgeInfo:
        'inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700',
    badgeWarning:
        'inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700',
    badgeDanger:
        'inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700',
    choiceCard:
        'flex w-full items-start gap-3 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-colors hover:border-primary/50 hover:bg-blue-50/40',
    choiceCardActive: 'border-primary bg-blue-50 ring-2 ring-primary/15',
    noticeSuccess:
        'rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700',
    noticeError:
        'rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700',
};

export function statusBadgeClass( status?: boolean | string ) {
    if ( status === 'sent' || status === 'active' || status === true ) {
        return ui.badgeSuccess;
    }

    if (
        status === 'sending' ||
        status === 'scheduled' ||
        status === 'pending'
    ) {
        return ui.badgeInfo;
    }

    if ( status === 'failed' || status === false || status === 'inactive' ) {
        return ui.badgeDanger;
    }

    return ui.badge;
}

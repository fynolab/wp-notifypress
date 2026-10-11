import { useMemo, useState } from '@wordpress/element';
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import {
    ChevronLeft,
    ChevronRight,
    Globe,
    Search,
    Smartphone,
    Tablet,
    Monitor,
    Tag as TagIcon,
    Trash2,
    Users,
    Wifi,
    WifiOff,
    X,
} from 'lucide-react';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import { isUnauthorizedError, laravelRequest } from '../lib/api';
import { formatNumber } from '../lib/format';
import { ui } from '../lib/admin-ui';
import type {
    LaravelCollection,
    NotifyPressSettings,
    Subscriber,
    SubscriberTag,
} from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import { Input } from '../components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../components/ui/tooltip';

const paginationLinkClass =
    'flex items-center text-gray-900 bg-white border border-gray-300 hover:bg-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 cursor-pointer';

const fetchSubscribers = (settings: NotifyPressSettings, cursor: string) =>
    laravelRequest<LaravelCollection<Subscriber>>(settings, '/subscribers', {
        query: cursor ? { cursor } : {},
    });

const fetchTags = (settings: NotifyPressSettings) =>
    laravelRequest<{ data: SubscriberTag[] }>(settings, '/tags');

function DeviceIcon({ device }: { device?: string }) {
    const normalized = (device || '').toLowerCase();

    if (normalized.includes('mobile') || normalized.includes('phone')) {
        return <Smartphone className="h-3.5 w-3.5" />;
    }

    if (normalized.includes('tablet')) {
        return <Tablet className="h-3.5 w-3.5" />;
    }

    return <Monitor className="h-3.5 w-3.5" />;
}

// Matches the app's server-side `d M Y` cast (e.g. "29 Jun 2026"). The API
// sends ISO8601 in the app's timezone, so format the date portion as-is
// instead of converting to the browser's timezone.
function formatRegisteredDate(value?: string | null) {
    if (!value) {
        return '—';
    }

    const datePart = value.includes('T') ? value.slice(0, 10) : value;
    const date = new Date(`${datePart}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function SubscriberSkeletonRows() {
    return (
        <>
            {Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="animate-pulse">
                    {Array.from({ length: 10 }).map((__, cellIndex) => (
                        <TableCell key={cellIndex}>
                            <div
                                className={`h-4 rounded bg-muted ${
                                    cellIndex === 0 ? 'w-20' : 'w-24'
                                }`}
                            />
                        </TableCell>
                    ))}
                </TableRow>
            ))}
        </>
    );
}

export default function SubscribersPage() {
    const [cursor, setCursor] = useState('');
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();

    const settingsQuery = useQuery({
        queryKey: ['np-settings'],
        queryFn: getSettings,
    });

    const settings = settingsQuery.data;
    const hasToken = hasApiToken(settings);
    const token = getApiToken(settings);

    const subscribersQuery = useQuery({
        queryKey: ['np-subscribers', token, cursor],
        enabled: hasToken,
        queryFn: () => fetchSubscribers(settings as NotifyPressSettings, cursor),
        placeholderData: keepPreviousData,
        staleTime: 30000,
    });

    const tagsQuery = useQuery({
        queryKey: ['np-tags', token],
        enabled: hasToken,
        queryFn: () => fetchTags(settings as NotifyPressSettings),
    });
    const availableTags = tagsQuery.data?.data || [];

    const [addTagFor, setAddTagFor] = useState<Subscriber['id'] | null>(null);
    const [selectedTag, setSelectedTag] = useState<Record<string, string>>({});

    const deleteMutation = useMutation({
        mutationFn: (id: Subscriber['id']) =>
            laravelRequest(settings, `/subscribers/${id}`, {
                method: 'DELETE',
            }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['np-subscribers'] }),
    });

    const addTagMutation = useMutation({
        mutationFn: ({
            subscriberToken,
            tagId,
        }: {
            subscriberToken: string;
            tagId: number;
        }) =>
            laravelRequest(settings, `/subscribers/${subscriberToken}/tags`, {
                method: 'POST',
                body: { tag_id: tagId },
            }),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['np-subscribers'] }),
    });

    const removeTagMutation = useMutation({
        mutationFn: ({
            subscriberToken,
            tagId,
        }: {
            subscriberToken: string;
            tagId: number;
        }) =>
            laravelRequest(
                settings,
                `/subscribers/${subscriberToken}/tags/${tagId}`,
                { method: 'DELETE' },
            ),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ['np-subscribers'] }),
    });

    const rows = useMemo(
        () => subscribersQuery.data?.data || [],
        [subscribersQuery.data],
    );
    const filtered = useMemo(
        () =>
            search
                ? rows.filter((row) => {
                      const haystack = [
                          row.city,
                          row.country,
                          row.browser,
                          row.device,
                          row.ip,
                          row.timezone,
                      ]
                          .join(' ')
                          .toLowerCase();

                      return haystack.includes(search.toLowerCase());
                  })
                : rows,
        [rows, search],
    );

    const total = subscribersQuery.data?.total || rows.length || 0;
    const loading = subscribersQuery.isFetching && !subscribersQuery.data;
    const prevCursor = subscribersQuery.data?.prev_cursor || '';
    const nextCursor = subscribersQuery.data?.next_cursor || '';

    if (
        subscribersQuery.isError &&
        !isUnauthorizedError(subscribersQuery.error)
    ) {
        return (
            <section className={ui.cardPadded}>
                <h3 className="text-lg font-semibold text-foreground">
                    Subscribers unavailable
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {subscribersQuery.error instanceof Error
                        ? subscribersQuery.error.message
                        : 'Unable to load subscribers.'}
                </p>
            </section>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-8">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
                    <div>
                        <CardTitle className="text-xl font-bold">
                            Subscribers
                        </CardTitle>
                        <CardDescription className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {formatNumber(total)} total
                            </span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="flex items-center gap-1">
                                <span>
                                    Showing {rows.length} on this page
                                </span>
                            </span>
                        </CardDescription>
                    </div>
                    {rows.length > 0 ? (
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by city, country, browser…"
                                className="pl-9"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                            />
                        </div>
                    ) : null}
                </CardHeader>

                <CardContent className="p-0">
                    {rows.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                            <div className="rounded-full bg-muted p-4">
                                <Users className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold">
                                No subscribers yet
                            </h3>
                            <p className="text-sm text-muted-foreground max-w-xs">
                                Once visitors subscribe to push notifications
                                on your site, they'll appear here.
                            </p>
                        </div>
                    ) : filtered.length === 0 && !loading ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
                            <Search className="h-8 w-8 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">
                                No subscribers match your search.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow className="border-y border-border hover:bg-muted/50">
                                        <TableHead className="w-[120px]">
                                            Token
                                        </TableHead>
                                        <TableHead>Location</TableHead>
                                        <TableHead>Browser</TableHead>
                                        <TableHead>Device</TableHead>
                                        <TableHead>Timezone</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Tags</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Registered</TableHead>
                                        <TableHead className="w-[60px]" />
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-border [&_tr:last-child]:border-0">
                                    {loading ? (
                                        <SubscriberSkeletonRows />
                                    ) : (
                                        filtered.map((subscriber) => (
                                            <TableRow
                                                key={subscriber.id}
                                                className="group hover:bg-muted/40 transition-colors"
                                            >
                                                {/* Token */}
                                                <TableCell>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <span className="font-mono text-xs text-muted-foreground cursor-default">
                                                                    •••••
                                                                    {subscriber.token?.slice(
                                                                        -5,
                                                                    )}
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="top">
                                                                <p className="font-mono text-xs max-w-[300px] break-all">
                                                                    {
                                                                        subscriber.token
                                                                    }
                                                                </p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>

                                                {/* Location */}
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                        <span className="text-sm">
                                                            {[
                                                                subscriber.city,
                                                                subscriber.country,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(', ') ||
                                                                '—'}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Browser */}
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className="font-normal"
                                                    >
                                                        {subscriber.browser ||
                                                            '—'}
                                                    </Badge>
                                                </TableCell>

                                                {/* Device */}
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                        <DeviceIcon
                                                            device={
                                                                subscriber.device
                                                            }
                                                        />
                                                        <span className="capitalize">
                                                            {subscriber.device ||
                                                                '—'}
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                {/* Timezone */}
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {subscriber.timezone || '—'}
                                                </TableCell>

                                                {/* IP */}
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {subscriber.ip || '—'}
                                                </TableCell>

                                                {/* Tags */}
                                                <TableCell>
                                                    <div className="flex flex-wrap items-center gap-1 min-w-[120px]">
                                                        {(
                                                            subscriber.tags ||
                                                            []
                                                        ).map((t) => (
                                                            <span
                                                                key={t.id}
                                                                className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                                                            >
                                                                <TagIcon className="h-2.5 w-2.5" />
                                                                {t.name}
                                                                <button
                                                                    type="button"
                                                                    className="ml-0.5 hover:text-destructive cursor-pointer"
                                                                    onClick={() =>
                                                                        removeTagMutation.mutate(
                                                                            {
                                                                                subscriberToken:
                                                                                    String(
                                                                                        subscriber.token,
                                                                                    ),
                                                                                tagId: t.id,
                                                                            },
                                                                        )
                                                                    }
                                                                    title={`Remove tag ${t.name}`}
                                                                >
                                                                    <X className="h-2.5 w-2.5" />
                                                                </button>
                                                            </span>
                                                        ))}
                                                        {addTagFor ===
                                                        subscriber.id ? (
                                                            <div className="flex items-center gap-1 mt-1">
                                                                <select
                                                                    className="h-6 rounded border border-input bg-background px-1 text-xs"
                                                                    value={
                                                                        selectedTag[
                                                                            String(
                                                                                subscriber.id,
                                                                            )
                                                                        ] || ''
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        setSelectedTag(
                                                                            (
                                                                                prev,
                                                                            ) => ({
                                                                                ...prev,
                                                                                [String(
                                                                                    subscriber.id,
                                                                                )]:
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                            }),
                                                                        )
                                                                    }
                                                                >
                                                                    <option value="">
                                                                        Pick
                                                                        tag…
                                                                    </option>
                                                                    {availableTags
                                                                        .filter(
                                                                            (
                                                                                t,
                                                                            ) =>
                                                                                !(
                                                                                    subscriber.tags ||
                                                                                    []
                                                                                ).some(
                                                                                    (
                                                                                        st,
                                                                                    ) =>
                                                                                        st.id ===
                                                                                        t.id,
                                                                                ),
                                                                        )
                                                                        .map(
                                                                            (
                                                                                t,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        t.id
                                                                                    }
                                                                                    value={String(
                                                                                        t.id,
                                                                                    )}
                                                                                >
                                                                                    {
                                                                                        t.name
                                                                                    }
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                </select>
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6"
                                                                    disabled={
                                                                        !selectedTag[
                                                                            String(
                                                                                subscriber.id,
                                                                            )
                                                                        ]
                                                                    }
                                                                    title="Add"
                                                                    onClick={() => {
                                                                        const tagId =
                                                                            selectedTag[
                                                                                String(
                                                                                    subscriber.id,
                                                                                )
                                                                            ];

                                                                        if (
                                                                            !tagId
                                                                        ) {
                                                                            return;
                                                                        }

                                                                        addTagMutation.mutate(
                                                                            {
                                                                                subscriberToken:
                                                                                    String(
                                                                                        subscriber.token,
                                                                                    ),
                                                                                tagId: Number(
                                                                                    tagId,
                                                                                ),
                                                                            },
                                                                            {
                                                                                onSuccess:
                                                                                    () => {
                                                                                        setAddTagFor(
                                                                                            null,
                                                                                        );
                                                                                        setSelectedTag(
                                                                                            (
                                                                                                prev,
                                                                                            ) => {
                                                                                                const next =
                                                                                                    {
                                                                                                        ...prev,
                                                                                                    };

                                                                                                delete next[
                                                                                                    String(
                                                                                                        subscriber.id,
                                                                                                    )
                                                                                                ];

                                                                                                return next;
                                                                                            },
                                                                                        );
                                                                                    },
                                                                            },
                                                                        );
                                                                    }}
                                                                >
                                                                    <TagIcon className="h-3 w-3" />
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-6 w-6"
                                                                    title="Cancel"
                                                                    onClick={() =>
                                                                        setAddTagFor(
                                                                            null,
                                                                        )
                                                                    }
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ) : availableTags.length >
                                                          0 ? (
                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center rounded-full border border-dashed border-border px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground hover:border-foreground cursor-pointer"
                                                                onClick={() =>
                                                                    setAddTagFor(
                                                                        subscriber.id,
                                                                    )
                                                                }
                                                                title="Add tag"
                                                            >
                                                                + tag
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                </TableCell>

                                                {/* Active status */}
                                                <TableCell>
                                                    {subscriber.active ? (
                                                        <Badge className="gap-1 bg-emerald-600/10 text-emerald-600 dark:bg-green-900/30 dark:text-green-300 border-0">
                                                            <Wifi className="h-3 w-3" />
                                                            Active
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="secondary"
                                                            className="gap-1 text-muted-foreground"
                                                        >
                                                            <WifiOff className="h-3 w-3" />
                                                            Inactive
                                                        </Badge>
                                                    )}
                                                </TableCell>

                                                {/* Registered at */}
                                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                    {formatRegisteredDate(
                                                        subscriber.created_at,
                                                    )}
                                                </TableCell>

                                                {/* Delete */}
                                                <TableCell>
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                                                                    disabled={
                                                                        deleteMutation.isPending
                                                                    }
                                                                    onClick={() => {
                                                                        if (
                                                                            !window.confirm(
                                                                                'Are you sure you want to delete this subscriber?',
                                                                            )
                                                                        ) {
                                                                            return;
                                                                        }

                                                                        deleteMutation.mutate(
                                                                            subscriber.id,
                                                                        );
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent side="left">
                                                                Delete
                                                                subscriber
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>

                {rows.length > 0 ? (
                    <CardFooter className="justify-end pt-4">
                        <div className="flex overflow-x-auto sm:justify-center">
                            {prevCursor ? (
                                <button
                                    type="button"
                                    className={paginationLinkClass}
                                    onClick={() => setCursor(prevCursor)}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </button>
                            ) : null}
                            {nextCursor ? (
                                <button
                                    type="button"
                                    className={paginationLinkClass}
                                    onClick={() => setCursor(nextCursor)}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            ) : null}
                        </div>
                    </CardFooter>
                ) : null}
            </Card>
        </div>
    );
}

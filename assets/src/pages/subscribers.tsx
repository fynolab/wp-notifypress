import { useMemo, useState } from '@wordpress/element';
import { Link } from 'react-router-dom';
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { BellRing, Search, Users } from 'lucide-react';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import { isUnauthorizedError, laravelRequest } from '../lib/api';
import { ui } from '../lib/admin-ui';
import type {
    LaravelCollection,
    NotifyPressSettings,
    Subscriber,
    SubscriberTag,
} from '../types';
import { useConfirm } from '../components/confirm-dialog';
import {
    CursorPager,
    EmptyState,
    PageHeader,
    SearchInput,
    SectionCard,
} from '../components/page-parts';
import { formatCount } from '../components/dashboard/format';
import { SubscriberStats } from '../components/subscribers/subscriber-parts';
import { SUBSCRIBERS_LIST_PARAMS } from '../components/subscribers/subscribers-query';
import { SubscriberRow } from '../components/subscribers/subscriber-row';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';

// GET /subscribers also sends the site's active count next to `total`. Both
// are cached server side and can arrive as numeric strings.
type SubscriberPage = Omit< LaravelCollection< Subscriber >, 'total' > & {
    total?: number | string;
    active?: number | string;
    // Tagging is a paid feature. Older app versions do not send the flag, so
    // a missing value keeps the tag controls unlocked as before.
    isPaidUser?: boolean;
};

const fetchSubscribers = ( settings: NotifyPressSettings, cursor: string ) =>
    laravelRequest< SubscriberPage >( settings, '/subscribers', {
        query: cursor
            ? { ...SUBSCRIBERS_LIST_PARAMS, cursor }
            : SUBSCRIBERS_LIST_PARAMS,
    } );

const fetchTags = ( settings: NotifyPressSettings ) =>
    laravelRequest< { data: SubscriberTag[] } >( settings, '/tags' );

function siteNameFor( settings?: NotifyPressSettings ): string | null {
    if ( settings?.siteName ) {
        return settings.siteName;
    }

    if ( settings?.connectedSite?.site_name ) {
        return settings.connectedSite.site_name;
    }

    const url = settings?.siteUrl || window.notifypress?.siteUrl || '';

    return (
        url
            .replace( /(^\w+:|^)\/\//, '' )
            .replace( /^www\./, '' )
            .split( '/' )[ 0 ] || null
    );
}

const SHORT_MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

// Matches the app's server-side `d M Y` cast (e.g. "29 Jun 2026"). The API
// sends ISO8601 in the app's timezone, so format the date portion as-is
// instead of converting to the browser's timezone.
function formatRegisteredDate( value?: string | null ) {
    if ( ! value ) {
        return '—';
    }

    const datePart = value.includes( 'T' ) ? value.slice( 0, 10 ) : value;
    const date = new Date( `${ datePart }T00:00:00` );

    if ( Number.isNaN( date.getTime() ) ) {
        return value;
    }

    // Built by hand: PHP's `M` is always three letters ("Sep"), while
    // Intl's en-GB short month writes "Sept".
    const day = String( date.getDate() ).padStart( 2, '0' );

    return `${ day } ${
        SHORT_MONTHS[ date.getMonth() ]
    } ${ date.getFullYear() }`;
}

function SubscriberSkeletonRows() {
    return (
        <>
            { Array.from( { length: 5 } ).map( ( _, index ) => (
                <TableRow key={ index } className="animate-pulse">
                    { Array.from( { length: 9 } ).map( ( __, cellIndex ) => (
                        <TableCell key={ cellIndex }>
                            <div
                                className={ `h-4 rounded bg-muted ${
                                    cellIndex === 0 ? 'w-20' : 'w-24'
                                }` }
                            />
                        </TableCell>
                    ) ) }
                </TableRow>
            ) ) }
        </>
    );
}

export default function SubscribersPage() {
    const [ confirm, confirmDialog ] = useConfirm();
    const [ cursor, setCursor ] = useState( '' );
    const [ search, setSearch ] = useState( '' );
    const queryClient = useQueryClient();

    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );

    const settings = settingsQuery.data;
    const hasToken = hasApiToken( settings );
    const token = getApiToken( settings );
    const siteName = siteNameFor( settings );

    const subscribersQuery = useQuery( {
        queryKey: [ 'np-subscribers', token, cursor ],
        enabled: hasToken,
        queryFn: () =>
            fetchSubscribers( settings as NotifyPressSettings, cursor ),
        placeholderData: keepPreviousData,
        staleTime: 30000,
    } );

    const tagsQuery = useQuery( {
        queryKey: [ 'np-tags', token ],
        enabled: hasToken,
        queryFn: () => fetchTags( settings as NotifyPressSettings ),
    } );
    const availableTags = tagsQuery.data?.data || [];

    const [ addTagFor, setAddTagFor ] = useState< Subscriber[ 'id' ] | null >(
        null
    );
    const [ selectedTag, setSelectedTag ] = useState<
        Record< string, string >
    >( {} );

    const deleteMutation = useMutation( {
        mutationFn: ( id: Subscriber[ 'id' ] ) =>
            laravelRequest( settings, `/subscribers/${ id }`, {
                method: 'DELETE',
            } ),
        onSuccess: () =>
            queryClient.invalidateQueries( { queryKey: [ 'np-subscribers' ] } ),
    } );

    const addTagMutation = useMutation( {
        mutationFn: ( {
            subscriberToken,
            tagId,
        }: {
            subscriberToken: string;
            tagId: number;
        } ) =>
            laravelRequest(
                settings,
                `/subscribers/${ subscriberToken }/tags`,
                {
                    method: 'POST',
                    body: { tag_id: tagId },
                }
            ),
        onSuccess: () =>
            queryClient.invalidateQueries( { queryKey: [ 'np-subscribers' ] } ),
    } );

    const removeTagMutation = useMutation( {
        mutationFn: ( {
            subscriberToken,
            tagId,
        }: {
            subscriberToken: string;
            tagId: number;
        } ) =>
            laravelRequest(
                settings,
                `/subscribers/${ subscriberToken }/tags/${ tagId }`,
                { method: 'DELETE' }
            ),
        onSuccess: () =>
            queryClient.invalidateQueries( { queryKey: [ 'np-subscribers' ] } ),
    } );

    const rows = useMemo(
        () => subscribersQuery.data?.data || [],
        [ subscribersQuery.data ]
    );
    const filtered = useMemo( () => {
        if ( ! search ) {
            return rows;
        }

        const needle = search.toLowerCase();

        return rows.filter( ( row ) =>
            [ row.city, row.country, row.browser, row.device, row.ip ]
                .join( ' ' )
                .toLowerCase()
                .includes( needle )
        );
    }, [ rows, search ] );

    const total = Number( subscribersQuery.data?.total || rows.length || 0 );
    // Older app versions do not send `active`; keep it unknown (null) then.
    const rawActive = subscribersQuery.data?.active;
    const active =
        rawActive === undefined || rawActive === null
            ? null
            : Number( rawActive );
    const isPaidUser = subscribersQuery.data?.isPaidUser ?? true;
    const loading = subscribersQuery.isFetching && ! subscribersQuery.data;
    const prevCursor = subscribersQuery.data?.prev_cursor || '';
    const nextCursor = subscribersQuery.data?.next_cursor || '';

    if (
        subscribersQuery.isError &&
        ! isUnauthorizedError( subscribersQuery.error )
    ) {
        return (
            <section className={ ui.cardPadded }>
                <h3 className="text-lg font-semibold text-foreground">
                    Subscribers unavailable
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    { subscribersQuery.error instanceof Error
                        ? subscribersQuery.error.message
                        : 'Unable to load subscribers.' }
                </p>
            </section>
        );
    }

    const showEmptyState = rows.length === 0 && ! loading;
    const showNoMatches =
        ! showEmptyState && filtered.length === 0 && ! loading;
    const showTable = ! showEmptyState && ! showNoMatches;

    const handleAddTag = ( subscriber: Subscriber ) => {
        const key = String( subscriber.id );
        const tagId = selectedTag[ key ];

        if ( ! tagId ) {
            return;
        }

        addTagMutation.mutate(
            {
                subscriberToken: String( subscriber.token ),
                tagId: Number( tagId ),
            },
            {
                onSuccess: () => {
                    setAddTagFor( null );
                    setSelectedTag( ( prev ) => {
                        const next = { ...prev };

                        delete next[ key ];

                        return next;
                    } );
                },
            }
        );
    };

    const handleDelete = async ( subscriber: Subscriber ) => {
        const confirmed = await confirm( {
            title: 'Delete this subscriber?',
            description:
                'They stop receiving your notifications right away, and their tags and delivery history are removed for good. This cannot be undone. They can always opt in again from your site as a new subscriber.',
            confirmLabel: 'Delete subscriber',
            destructive: true,
        } );

        if ( ! confirmed ) {
            return;
        }

        deleteMutation.mutate( subscriber.id );
    };

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            { confirmDialog }
            <PageHeader
                title="Subscribers"
                description={
                    siteName
                        ? `People who get your push notifications on ${ siteName }`
                        : 'People who get your push notifications'
                }
                actions={
                    rows.length > 0 ? (
                        <SearchInput
                            value={ search }
                            onChange={ setSearch }
                            label="Search subscribers on this page"
                            placeholder="Search by city, country, browser…"
                            className="sm:w-72"
                        />
                    ) : null
                }
            />

            { total > 0 ? (
                <SubscriberStats total={ total } active={ active } />
            ) : null }

            <SectionCard
                title="All subscribers"
                description={ `Newest first${
                    rows.length > 0 ? ` · ${ rows.length } on this page` : ''
                }` }
                footer={
                    rows.length > 0 ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                Showing { rows.length } of{ ' ' }
                                { formatCount( total ) }
                            </p>
                            <CursorPager
                                hasPrevious={ Boolean( prevCursor ) }
                                hasNext={ Boolean( nextCursor ) }
                                onPrevious={ () => {
                                    setCursor( prevCursor );
                                } }
                                onNext={ () => {
                                    setCursor( nextCursor );
                                } }
                                label="Subscriber pages"
                                disabled={ subscribersQuery.isFetching }
                            />
                        </>
                    ) : null
                }
            >
                { showEmptyState ? (
                    <EmptyState
                        icon={ <Users className="h-5 w-5" /> }
                        title="No subscribers yet"
                    >
                        <p className="max-w-72 text-sm text-muted-foreground">
                            Once visitors subscribe to push notifications on
                            your site, they&apos;ll appear here.
                        </p>
                        <Link
                            to="/settings?tab=optin"
                            className={ `${ ui.primaryButton } mt-1 hover:text-primary-foreground focus:text-primary-foreground` }
                        >
                            <BellRing className="h-4 w-4" aria-hidden />
                            Review the opt-in prompt
                        </Link>
                    </EmptyState>
                ) : null }
                { showNoMatches ? (
                    <EmptyState
                        icon={ <Search className="h-5 w-5" /> }
                        title="No matches"
                    >
                        <p className="max-w-72 text-sm text-muted-foreground">
                            No subscribers match your search.
                        </p>
                    </EmptyState>
                ) : null }
                { showTable ? (
                    <div className="mt-4 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="whitespace-nowrap">
                                        Token
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Location
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Browser
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Device
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        IP Address
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Tags
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Status
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Registered
                                    </TableHead>
                                    <TableHead className="w-[52px]">
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                { loading ? (
                                    <SubscriberSkeletonRows />
                                ) : (
                                    filtered.map( ( subscriber ) => (
                                        <SubscriberRow
                                            key={ subscriber.id }
                                            subscriber={ subscriber }
                                            availableTags={ availableTags }
                                            isPaidUser={ isPaidUser }
                                            registered={ formatRegisteredDate(
                                                subscriber.created_at
                                            ) }
                                            isAddingTag={
                                                addTagFor === subscriber.id
                                            }
                                            selectedTagId={
                                                selectedTag[
                                                    String( subscriber.id )
                                                ] || ''
                                            }
                                            deleteDisabled={
                                                deleteMutation.isPending
                                            }
                                            onStartAddTag={ () => {
                                                setAddTagFor( subscriber.id );
                                            } }
                                            onCancelAddTag={ () => {
                                                setAddTagFor( null );
                                            } }
                                            onSelectTag={ ( tagId ) => {
                                                setSelectedTag( ( prev ) => ( {
                                                    ...prev,
                                                    [ String( subscriber.id ) ]:
                                                        tagId,
                                                } ) );
                                            } }
                                            onAddTag={ () => {
                                                handleAddTag( subscriber );
                                            } }
                                            onRemoveTag={ ( tag ) => {
                                                removeTagMutation.mutate( {
                                                    subscriberToken: String(
                                                        subscriber.token
                                                    ),
                                                    tagId: tag.id,
                                                } );
                                            } }
                                            onDelete={ () => {
                                                handleDelete( subscriber );
                                            } }
                                        />
                                    ) )
                                ) }
                            </TableBody>
                        </Table>
                    </div>
                ) : null }
            </SectionCard>
        </div>
    );
}

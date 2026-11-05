import { useMemo, useState } from '@wordpress/element';
import {
    Link,
    Navigate,
    useLocation,
    useNavigate,
    useParams,
    useSearchParams,
} from 'react-router-dom';
import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { Filter, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { getApiToken, getSettings, hasApiToken } from '../lib/settings';
import { laravelRequest } from '../lib/api';
import { ui } from '../lib/admin-ui';
import type { NotifyPressSettings, Segment } from '../types';
import PaidFeatureOverlay from '../components/paid-feature-overlay';
import {
    Chip,
    CursorPager,
    EmptyState,
    PageHeader,
    SearchInput,
    SectionCard,
    SegmentedControl,
} from '../components/page-parts';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Button, buttonVariants } from '../components/ui/button';
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
import { cn } from '../components/utils';
import { RuleChips, normalizeRule } from '../components/segments/segment-parts';
import type { TagOption } from '../components/segments/segment-parts';
import { SegmentForm } from '../components/segments/segment-form';
import { ROW_ACTIONS, TagsTab } from '../components/segments/tags-tab';
import { formatDate } from '../lib/format';

type TabKey = 'segments' | 'tags';

const TABS: { key: TabKey; label: string }[] = [
    { key: 'segments', label: 'Segments' },
    { key: 'tags', label: 'Tags' },
];

// GET /segments rows carry a cached audience size next to the rule.
type SegmentRow = Segment & {
    subscriber_count?: number | string;
    subscriber_count_computed_at?: string | null;
};

// SegmentResource::collection( cursorPaginate() ): cursors live in `meta`.
type SegmentPage = {
    data?: SegmentRow[];
    meta?: {
        next_cursor?: string | null;
        prev_cursor?: string | null;
    };
    isPaidUser?: boolean;
};

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

function SegmentSkeletonRows() {
    return (
        <>
            { Array.from( { length: 4 } ).map( ( _, index ) => (
                <TableRow className="animate-pulse" key={ index }>
                    { Array.from( { length: 6 } ).map( ( __, cellIndex ) => (
                        <TableCell key={ cellIndex }>
                            <div
                                className={ `h-4 rounded bg-muted ${
                                    cellIndex === 0 ? 'w-40' : 'w-20'
                                }` }
                            />
                        </TableCell>
                    ) ) }
                </TableRow>
            ) ) }
        </>
    );
}

function DeleteDialog( {
    segment,
    busy,
    onCancel,
    onConfirm,
}: {
    segment: SegmentRow | null;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
} ) {
    const count = Number( segment?.subscriber_count || 0 );

    return (
        <AlertDialog
            open={ segment !== null }
            onOpenChange={ ( open ) => {
                if ( ! open && ! busy ) {
                    onCancel();
                }
            } }
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="mb-1 flex h-10 w-10 items-center justify-center self-center rounded-full bg-destructive/10 text-destructive sm:self-start">
                        <Trash2 className="h-5 w-5" aria-hidden />
                    </div>
                    <AlertDialogTitle>
                        Delete &ldquo;{ segment?.name }&rdquo;?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Its targeting rules are removed permanently, and this
                        cannot be undone. Your subscribers and their tags stay
                        untouched, but notifications can no longer be sent to
                        this audience.
                        { count > 0
                            ? ` It currently matches ${ count.toLocaleString() } subscriber${
                                  count === 1 ? '' : 's'
                              }.`
                            : '' }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={ busy }>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={ busy }
                        onClick={ ( event ) => {
                            event.preventDefault();
                            onConfirm();
                        } }
                    >
                        { busy ? 'Deleting…' : 'Delete segment' }
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function SegmentsPage() {
    const params = useParams();
    const navigate = useNavigate();
    const routerLocation = useLocation();
    const queryClient = useQueryClient();
    const [ searchParams, setSearchParams ] = useSearchParams();
    const activeTab: TabKey =
        searchParams.get( 'tab' ) === 'tags' ? 'tags' : 'segments';
    const [ search, setSearch ] = useState( '' );
    const [ cursor, setCursor ] = useState( '' );
    const [ segmentToDelete, setSegmentToDelete ] =
        useState< SegmentRow | null >( null );
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );
    const settings = settingsQuery.data;
    const hasToken = hasApiToken( settings );
    const token = getApiToken( settings );
    const siteName = siteNameFor( settings );
    const segmentId = params.segmentId;
    const isFormRoute =
        routerLocation.pathname.includes( '/segments/new' ) ||
        Boolean( segmentId );

    const segmentsQuery = useQuery( {
        // The first page keeps the key the sidebar hover-prefetch warms
        // (lib/prefetch-nav.ts), so that cache entry is still hit.
        queryKey: cursor
            ? [ 'np-segments', token, cursor ]
            : [ 'np-segments', token ],
        enabled: hasToken && ! isFormRoute,
        queryFn: () =>
            laravelRequest< SegmentPage >( settings, '/segments', {
                query: cursor ? { cursor } : {},
            } ),
        placeholderData: keepPreviousData,
    } );

    // Names the tag ids in each row's rule chips.
    const tagsQuery = useQuery( {
        queryKey: [ 'np-tags', token ],
        enabled: hasToken && ! isFormRoute && activeTab === 'segments',
        queryFn: () =>
            laravelRequest< { data: TagOption[] } >( settings, '/tags' ),
    } );
    const tags = tagsQuery.data?.data || [];

    const rows = useMemo(
        () => segmentsQuery.data?.data || [],
        [ segmentsQuery.data ]
    );

    const deleteMutation = useMutation( {
        mutationFn: ( id: Segment[ 'id' ] ) =>
            laravelRequest( settings, `/segments/${ id }`, {
                method: 'DELETE',
            } ),
        onSuccess: () => {
            setSegmentToDelete( null );
            // Deleting the last row of a later page would leave it empty.
            if ( rows.length <= 1 ) {
                setCursor( '' );
            }
            queryClient.invalidateQueries( { queryKey: [ 'np-segments' ] } );
            queryClient.invalidateQueries( {
                queryKey: [ 'np-segments-all' ],
            } );
        },
    } );

    const filteredRows = useMemo( () => {
        if ( ! search.trim() ) {
            return rows;
        }

        const needle = search.toLowerCase();
        return rows.filter( ( segment ) =>
            [ segment.name, segment.description || '' ]
                .join( ' ' )
                .toLowerCase()
                .includes( needle )
        );
    }, [ rows, search ] );
    const loading = segmentsQuery.isFetching && ! segmentsQuery.data;
    const isPaidUser = segmentsQuery.data?.isPaidUser ?? true;
    const prevCursor = segmentsQuery.data?.meta?.prev_cursor || '';
    const nextCursor = segmentsQuery.data?.meta?.next_cursor || '';

    if ( isFormRoute && ! hasToken ) {
        return <Navigate replace to="/segments" />;
    }

    if ( isFormRoute ) {
        if ( ! settings ) {
            return <p className={ ui.subtext }>Loading…</p>;
        }

        return <SegmentForm settings={ settings } segmentId={ segmentId } />;
    }

    const newSegmentLink = (
        <Link
            to="/segments/new"
            className={ cn(
                buttonVariants(),
                'h-10 gap-2 px-4 hover:text-primary-foreground focus:text-primary-foreground'
            ) }
        >
            <Plus className="h-4 w-4" aria-hidden />
            New Segment
        </Link>
    );

    let listBody: ReactNode = null;

    if ( loading ) {
        listBody = (
            <div className="mt-4 overflow-x-auto">
                <Table>
                    <TableBody>
                        <SegmentSkeletonRows />
                    </TableBody>
                </Table>
            </div>
        );
    } else if ( ! rows.length ) {
        listBody = (
            <EmptyState
                icon={ <Filter className="h-5 w-5" /> }
                title="No segments yet"
            >
                <p className="max-w-72 text-sm text-muted-foreground">
                    { hasToken
                        ? 'Create a segment to target a specific group of subscribers when sending notifications.'
                        : 'Connect NotifyPress to start creating audience segments for this site.' }
                </p>
                { hasToken ? (
                    <Link
                        to="/segments/new"
                        className={ cn(
                            buttonVariants(),
                            'mt-1 h-10 gap-2 px-4 hover:text-primary-foreground focus:text-primary-foreground'
                        ) }
                    >
                        <Plus className="h-4 w-4" aria-hidden />
                        Create your first segment
                    </Link>
                ) : null }
            </EmptyState>
        );
    } else if ( ! filteredRows.length ) {
        listBody = (
            <EmptyState
                icon={ <Search className="h-5 w-5" /> }
                title="No matches"
            >
                <p className="max-w-72 text-sm text-muted-foreground">
                    No segments match your search.
                </p>
            </EmptyState>
        );
    } else {
        listBody = (
            <div className="mt-4 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="whitespace-nowrap">
                                Segment
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                                Rules
                            </TableHead>
                            <TableHead className="whitespace-nowrap text-right">
                                Subscribers
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                                Status
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                                Created
                            </TableHead>
                            <TableHead className="w-[88px] whitespace-nowrap text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        { filteredRows.map( ( segment ) => (
                            <TableRow key={ segment.id } className="group">
                                <TableCell>
                                    <div className="flex min-w-48 max-w-80 items-center gap-3">
                                        <span
                                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                                            aria-hidden
                                        >
                                            <Filter className="h-4 w-4" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">
                                                { segment.name }
                                            </p>
                                            <p className="truncate text-xs text-muted-foreground">
                                                { segment.description ||
                                                    'No description' }
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <RuleChips
                                        rule={ normalizeRule( segment.rule ) }
                                        tags={ tags }
                                    />
                                </TableCell>
                                <TableCell className="text-right font-semibold tabular-nums text-foreground">
                                    { Number(
                                        segment.subscriber_count || 0
                                    ).toLocaleString() }
                                </TableCell>
                                <TableCell>
                                    { segment.is_active ? (
                                        <Chip tone="success" dot>
                                            Active
                                        </Chip>
                                    ) : (
                                        <Chip dot>Inactive</Chip>
                                    ) }
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                                    { formatDate( segment.created_at, '-' ) }
                                </TableCell>
                                <TableCell>
                                    <div className={ ROW_ACTIONS }>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={ `Edit ${ segment.name }` }
                                                        className="h-8 w-8"
                                                        onClick={ () => {
                                                            navigate(
                                                                `/segments/${ segment.id }/edit`
                                                            );
                                                        } }
                                                    >
                                                        <Pencil
                                                            className="h-4 w-4"
                                                            aria-hidden
                                                        />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    Edit segment
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        aria-label={ `Delete ${ segment.name }` }
                                                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        onClick={ () => {
                                                            setSegmentToDelete(
                                                                segment
                                                            );
                                                        } }
                                                    >
                                                        <Trash2
                                                            className="h-4 w-4"
                                                            aria-hidden
                                                        />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent side="top">
                                                    Delete segment
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) ) }
                    </TableBody>
                </Table>
            </div>
        );
    }

    return (
        <div className="container mx-auto space-y-6 px-4 py-6 sm:py-8">
            <PageHeader
                title="Segments"
                description={
                    siteName
                        ? `Target specific groups of subscribers on ${ siteName }`
                        : 'Target specific groups of subscribers'
                }
                actions={
                    <>
                        <SegmentedControl
                            value={ activeTab }
                            options={ TABS }
                            onChange={ ( tab ) => {
                                setSearchParams(
                                    tab === 'tags' ? { tab: 'tags' } : {}
                                );
                            } }
                            label="Segments or tags"
                        />
                        { activeTab === 'segments' && hasToken && isPaidUser
                            ? newSegmentLink
                            : null }
                    </>
                }
            />

            { activeTab === 'tags' ? (
                <PaidFeatureOverlay
                    isPaidUser={ isPaidUser }
                    featureName="Tags"
                    description="Tags are available on Starter plans and above. Upgrade to label subscribers and build segments from those labels."
                >
                    <TagsTab settings={ settings } />
                </PaidFeatureOverlay>
            ) : (
                <PaidFeatureOverlay
                    isPaidUser={ isPaidUser }
                    featureName="Segments"
                    description="Audience segmentation is available on Starter plans and above. Upgrade to target specific groups of subscribers when sending notifications."
                >
                    <SectionCard
                        title="All segments"
                        description={
                            rows.length > 0
                                ? `${ rows.length } ${
                                      rows.length === 1 ? 'segment' : 'segments'
                                  } on this page`
                                : 'Audiences you can send campaigns to'
                        }
                        actions={
                            rows.length > 0 ? (
                                <SearchInput
                                    value={ search }
                                    onChange={ setSearch }
                                    label="Search segments"
                                    placeholder="Search segments…"
                                />
                            ) : null
                        }
                        footer={
                            rows.length > 0 ? (
                                <>
                                    <p className="text-sm text-muted-foreground">
                                        Oldest first
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
                                        label="Segment pages"
                                        disabled={ segmentsQuery.isFetching }
                                    />
                                </>
                            ) : null
                        }
                    >
                        { listBody }
                    </SectionCard>
                </PaidFeatureOverlay>
            ) }

            <DeleteDialog
                busy={ deleteMutation.isPending }
                onCancel={ () => {
                    setSegmentToDelete( null );
                } }
                onConfirm={ () => {
                    if ( segmentToDelete ) {
                        deleteMutation.mutate( segmentToDelete.id );
                    }
                } }
                segment={ segmentToDelete }
            />
        </div>
    );
}

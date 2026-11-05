import { useState } from '@wordpress/element';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Bell,
    Check,
    Eye,
    Link as LinkIcon,
    Mail as MessageIcon,
    Plus,
} from 'lucide-react';
import { laravelRequest } from '../lib/api';
import { getSettings } from '../lib/settings';
import { ui } from '../lib/admin-ui';
import { Button } from '../components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import {
    Chip,
    EmptyState,
    PageHeader,
    SearchInput,
    SectionCard,
    SegmentedLinks,
} from '../components/page-parts';
import { formatDateTime } from '../components/dashboard/format';
import { automationsListQuery } from '../components/automations/automations-query';
import type { NotifyPressSettings } from '../types';

interface MessageRow {
    channel: string;
    message_id: number;
    title: string;
    thumbnail_url: string | null;
    updated_at: string;
    step_id: number | null;
    automation_id: number | null;
    automation_name: string | null;
    automation_status: string | null;
    usage_count: number;
}

interface AutomationOption {
    id: number;
    name: string;
    status: string;
}

interface MessagesResponse {
    data?: MessageRow[];
    automations?: AutomationOption[];
}

const channelLabels: Record< string, string > = {
    web_push: 'Web Push',
};

function MessagesList( { settings }: { settings: NotifyPressSettings } ) {
    const queryClient = useQueryClient();
    const [ search, setSearch ] = useState( '' );
    const [ sort, setSort ] = useState( 'newest' );
    const [ automationId, setAutomationId ] = useState( 'all' );
    const [ automationStatus, setAutomationStatus ] = useState( 'all' );
    const [ previewing, setPreviewing ] = useState< MessageRow | null >( null );
    const [ copiedId, setCopiedId ] = useState< number | null >( null );

    const listQuery = useQuery( {
        queryKey: [
            'np-automation-messages',
            settings.apiToken,
            search,
            sort,
            automationId,
            automationStatus,
        ],
        queryFn: () =>
            laravelRequest< MessagesResponse >(
                settings,
                '/automations/messages',
                {
                    query: {
                        q: search || undefined,
                        sort,
                        automation_id:
                            automationId === 'all' ? undefined : automationId,
                        automation_status:
                            automationStatus === 'all'
                                ? undefined
                                : automationStatus,
                    },
                }
            ),
    } );

    const messages = listQuery.data?.data ?? [];
    const automations = listQuery.data?.automations ?? [];

    // Uses the same helper as AutomationsList's `listQuery`, so hovering
    // "Workflows" from here warms the unfiltered first page it reads on mount.
    const prefetchWorkflows = () =>
        queryClient.prefetchQuery( automationsListQuery( settings ) );

    const handleCopyLink = ( row: MessageRow ) => {
        const url = `${ window.location.origin }${ window.location.pathname }?page=notifypress#/notifications/${ row.message_id }/edit`;
        navigator.clipboard.writeText( url );
        setCopiedId( row.message_id );
        window.setTimeout( () => setCopiedId( null ), 1500 );
    };

    const createButton = (
        <Button asChild className="h-10 gap-2 px-4">
            <Link to="/notifications/new?message=1">
                <Plus className="h-4 w-4" aria-hidden />
                Create message
            </Link>
        </Button>
    );
    const filtered = Boolean(
        search || automationId !== 'all' || automationStatus !== 'all'
    );

    let tableContent: JSX.Element;

    if ( listQuery.isLoading ) {
        tableContent = (
            <p className="mt-4 py-10 text-center text-sm text-muted-foreground">
                Loading…
            </p>
        );
    } else if ( messages.length === 0 ) {
        tableContent = (
            <EmptyState
                icon={ <MessageIcon className="h-5 w-5" /> }
                title={ filtered ? 'No messages match' : 'No messages yet' }
            >
                <p className="max-w-80 text-sm text-muted-foreground">
                    { filtered
                        ? 'Try a different search or filter.'
                        : 'Create a message to use in an automation\'s "Send" step.' }
                </p>
                { filtered ? null : (
                    <div className="mt-1">{ createButton }</div>
                ) }
            </EmptyState>
        );
    } else {
        tableContent = (
            <div className="mt-4 overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="whitespace-nowrap">
                                Message
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                                Used in
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                                Channel
                            </TableHead>
                            <TableHead className="whitespace-nowrap">
                                Last edited
                            </TableHead>
                            <TableHead className="w-[88px]">
                                <span className="sr-only">Actions</span>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        { messages.map( ( row ) => (
                            <TableRow
                                key={ `${ row.channel }:${ row.message_id }` }
                            >
                                <TableCell>
                                    <div className="flex min-w-56 max-w-96 items-center gap-3">
                                        { row.thumbnail_url ? (
                                            <img
                                                src={ row.thumbnail_url }
                                                alt=""
                                                className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border"
                                            />
                                        ) : (
                                            <span
                                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                                                aria-hidden
                                            >
                                                <Bell className="h-4 w-4" />
                                            </span>
                                        ) }
                                        <div className="min-w-0">
                                            <Link
                                                to={ `/notifications/${ row.message_id }/edit` }
                                                className="block truncate font-medium text-foreground hover:text-primary"
                                            >
                                                { row.title }
                                            </Link>
                                            <p className="truncate text-xs text-muted-foreground">
                                                Message #{ row.message_id }
                                                { row.step_id
                                                    ? ` · Step #${ row.step_id }`
                                                    : '' }
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    { row.automation_id ? (
                                        <div className="min-w-40">
                                            <Link
                                                to={ `/automations/${ row.automation_id }/edit` }
                                                className="block truncate text-sm font-medium text-foreground hover:text-primary"
                                            >
                                                { row.automation_name ??
                                                    `Automation #${ row.automation_id }` }
                                            </Link>
                                            <p className="text-xs text-muted-foreground">
                                                { row.usage_count > 1
                                                    ? `${ row.usage_count } steps`
                                                    : '1 step' }
                                            </p>
                                        </div>
                                    ) : (
                                        <Chip>Not used yet</Chip>
                                    ) }
                                </TableCell>
                                <TableCell>
                                    <Chip tone="primary">
                                        { channelLabels[ row.channel ] ??
                                            row.channel }
                                    </Chip>
                                </TableCell>
                                <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                                    { formatDateTime( row.updated_at ) }
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={ () =>
                                                setPreviewing( row )
                                            }
                                            title="Preview"
                                            aria-label={ `Preview ${ row.title }` }
                                        >
                                            <Eye
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={ () =>
                                                handleCopyLink( row )
                                            }
                                            title={
                                                copiedId === row.message_id
                                                    ? 'Copied!'
                                                    : 'Copy link'
                                            }
                                            aria-label={ `Copy link to ${ row.title }` }
                                        >
                                            { copiedId === row.message_id ? (
                                                <Check
                                                    className="h-4 w-4"
                                                    aria-hidden
                                                />
                                            ) : (
                                                <LinkIcon
                                                    className="h-4 w-4"
                                                    aria-hidden
                                                />
                                            ) }
                                        </Button>
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
                title="Messages"
                description="Reusable notification content for automations. Editing a message updates it everywhere it's used."
                actions={
                    <>
                        <div
                            onMouseEnter={ prefetchWorkflows }
                            onFocus={ prefetchWorkflows }
                        >
                            <SegmentedLinks
                                label="Automation sections"
                                items={ [
                                    {
                                        to: '/automations',
                                        label: 'Workflows',
                                        active: false,
                                    },
                                    {
                                        to: '/automations/messages',
                                        label: 'Messages',
                                        active: true,
                                    },
                                ] }
                            />
                        </div>
                        { createButton }
                    </>
                }
            />

            <SectionCard
                title="Message library"
                description={ `${ messages.length } ${
                    messages.length === 1 ? 'message' : 'messages'
                }` }
                actions={
                    <SearchInput
                        value={ search }
                        onChange={ setSearch }
                        label="Search messages"
                        placeholder="Search by name or ID"
                    />
                }
            >
                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Select value={ sort } onValueChange={ setSort }>
                        <SelectTrigger
                            aria-label="Sort"
                            className="h-9 w-full rounded-lg sm:w-44"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest first</SelectItem>
                            <SelectItem value="oldest">Oldest first</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select
                        value={ automationId }
                        onValueChange={ setAutomationId }
                    >
                        <SelectTrigger
                            aria-label="Automation"
                            className="h-9 w-full rounded-lg sm:w-48"
                        >
                            <SelectValue placeholder="Automation" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All automations</SelectItem>
                            { automations.map( ( automation ) => (
                                <SelectItem
                                    key={ automation.id }
                                    value={ String( automation.id ) }
                                >
                                    { automation.name }
                                </SelectItem>
                            ) ) }
                        </SelectContent>
                    </Select>
                    <Select
                        value={ automationStatus }
                        onValueChange={ setAutomationStatus }
                    >
                        <SelectTrigger
                            aria-label="Automation status"
                            className="h-9 w-full rounded-lg sm:w-44"
                        >
                            <SelectValue placeholder="Automation status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Any status</SelectItem>
                            <SelectItem value="draft">Inactive</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                { tableContent }
            </SectionCard>

            <Dialog
                open={ Boolean( previewing ) }
                onOpenChange={ ( open ) => {
                    if ( ! open ) {
                        setPreviewing( null );
                    }
                } }
            >
                <DialogContent>
                    { previewing ? (
                        <>
                            <DialogHeader>
                                <DialogTitle>{ previewing.title }</DialogTitle>
                            </DialogHeader>
                            { previewing.thumbnail_url ? (
                                <img
                                    src={ previewing.thumbnail_url }
                                    alt=""
                                    className="w-full rounded-lg object-cover"
                                />
                            ) : null }
                            <p className="text-sm text-muted-foreground">
                                Used in { previewing.usage_count } step
                                { previewing.usage_count === 1
                                    ? ''
                                    : 's' }{ ' ' }
                                across your automations.
                            </p>
                        </>
                    ) : null }
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function AutomationMessagesPage() {
    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
    } );

    const settings = settingsQuery.data;

    if ( ! settings ) {
        return <p className={ ui.subtext }>Loading…</p>;
    }

    return <MessagesList settings={ settings } />;
}

import { useState } from '@wordpress/element';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
    Check,
    Eye,
    Link as LinkIcon,
    Mail as MessageIcon,
    Plus,
} from 'lucide-react';
import { laravelRequest } from '../lib/api';
import { getSettings } from '../lib/settings';
import { ui } from '../lib/admin-ui';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
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
    const [ previewing, setPreviewing ] = useState< MessageRow | null >(
        null
    );
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

    // Mirrors AutomationsList's `listQuery` in automations.tsx exactly, so
    // hovering "Workflows" from here warms the same cache entry that page
    // reads on mount.
    const prefetchWorkflows = () =>
        queryClient.prefetchQuery( {
            queryKey: [ 'np-automations', settings.apiToken ],
            queryFn: () => laravelRequest( settings, '/automations' ),
        } );

    const handleCopyLink = ( row: MessageRow ) => {
        const url = `${ window.location.origin }${ window.location.pathname }?page=notifypress#/notifications/${ row.message_id }/edit`;
        navigator.clipboard.writeText( url );
        setCopiedId( row.message_id );
        window.setTimeout( () => setCopiedId( null ), 1500 );
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Messages
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Messages are reusable notification content built
                        specifically for automations. Editing a message here
                        updates it everywhere it&apos;s used — automations
                        reference the same message, not a copy.
                    </p>
                </div>
                <Button asChild>
                    <Link to="/notifications/new?message=1">
                        <Plus className="mr-2 h-4 w-4" />
                        Create message
                    </Link>
                </Button>
            </div>

            <div className="flex items-center gap-2 border-b">
                <Link
                    to="/automations"
                    className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                    onMouseEnter={ prefetchWorkflows }
                    onFocus={ prefetchWorkflows }
                >
                    Workflows
                </Link>
                <Link
                    to="/automations/messages"
                    className="border-b-2 border-primary px-3 py-2 text-sm font-medium"
                >
                    Messages
                </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <Input
                    value={ search }
                    onChange={ ( event ) => setSearch( event.target.value ) }
                    placeholder="Search by name or ID"
                    className="max-w-xs"
                />
                <Select value={ sort } onValueChange={ setSort }>
                    <SelectTrigger className="w-44">
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
                    <SelectTrigger className="w-44">
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
                    <SelectTrigger className="w-44">
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

            { messages.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <MessageIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
                        <h3 className="text-lg font-medium">
                            No messages yet
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 mb-6">
                            Create a message to use in an automation&apos;s
                            &quot;Send&quot; step.
                        </p>
                        <Button asChild>
                            <Link to="/notifications/new?message=1">
                                <Plus className="mr-2 h-4 w-4" />
                                Create message
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Message</TableHead>
                                <TableHead>Channel</TableHead>
                                <TableHead>Last edited</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            { messages.map( ( row ) => (
                                <TableRow
                                    key={ `${ row.channel }:${ row.message_id }` }
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            { row.thumbnail_url ? (
                                                <img
                                                    src={ row.thumbnail_url }
                                                    alt=""
                                                    className="h-10 w-10 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="h-10 w-10 rounded bg-muted" />
                                            ) }
                                            <div>
                                                <Link
                                                    to={ `/notifications/${ row.message_id }/edit` }
                                                    className="font-medium hover:underline"
                                                >
                                                    { row.title }
                                                </Link>
                                                <p className="text-xs text-muted-foreground">
                                                    { row.automation_id ? (
                                                        <>
                                                            Message #
                                                            { row.message_id }{ ' ' }
                                                            · Step #
                                                            { row.step_id } ·
                                                            Automation #
                                                            { row.automation_id }
                                                            { row.usage_count >
                                                            1
                                                                ? ` · used in ${ row.usage_count } steps`
                                                                : '' }
                                                        </>
                                                    ) : (
                                                        <>
                                                            Message #
                                                            { row.message_id }{ ' ' }
                                                            · Not yet used in
                                                            an automation
                                                        </>
                                                    ) }
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            { channelLabels[ row.channel ] ??
                                                row.channel }
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        { new Date(
                                            row.updated_at
                                        ).toLocaleString() }
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={ () =>
                                                    setPreviewing( row )
                                                }
                                                title="Preview"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={ () =>
                                                    handleCopyLink( row )
                                                }
                                                title={
                                                    copiedId ===
                                                    row.message_id
                                                        ? 'Copied!'
                                                        : 'Copy link'
                                                }
                                            >
                                                { copiedId ===
                                                row.message_id ? (
                                                    <Check className="h-4 w-4" />
                                                ) : (
                                                    <LinkIcon className="h-4 w-4" />
                                                ) }
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) ) }
                        </TableBody>
                    </Table>
                </Card>
            ) }

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
                                <DialogTitle>
                                    { previewing.title }
                                </DialogTitle>
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
                                { previewing.usage_count === 1 ? '' : 's' }{ ' ' }
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

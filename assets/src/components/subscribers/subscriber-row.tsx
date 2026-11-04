import { useState } from 'react';
import { Lock, Plus, Tag as TagIcon, Trash2, X } from 'lucide-react';

import { BILLING_URL } from '../../lib/app';
import { Button } from '../ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { TableCell, TableRow } from '../ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '../ui/tooltip';
import { BrowserIcon, DeviceIcon, StatusChip } from './subscriber-parts';
import type { Subscriber, SubscriberTag } from '../../types';

/** Tags shown per row before the rest fold into a "+N more" chip. */
const VISIBLE_TAGS = 2;

type Props = {
    subscriber: Subscriber;
    availableTags: SubscriberTag[];
    /** Tagging is a paid feature; free users get a locked chip instead. */
    isPaidUser: boolean;
    registered: string;
    isAddingTag: boolean;
    selectedTagId: string;
    deleteDisabled: boolean;
    onStartAddTag: () => void;
    onCancelAddTag: () => void;
    onSelectTag: ( tagId: string ) => void;
    onAddTag: () => void;
    onRemoveTag: ( tag: SubscriberTag ) => void;
    onDelete: () => void;
};

/**
 * One subscriber in the Subscribers table. Ported from the row markup in the
 * app's resources/js/Pages/Subscribers.tsx.
 *
 * @param {Props} props Component props.
 */
export function SubscriberRow( {
    subscriber,
    availableTags,
    isPaidUser,
    registered,
    isAddingTag,
    selectedTagId,
    deleteDisabled,
    onStartAddTag,
    onCancelAddTag,
    onSelectTag,
    onAddTag,
    onRemoveTag,
    onDelete,
}: Props ) {
    const [ showAllTags, setShowAllTags ] = useState( false );
    const tags = subscriber.tags || [];
    const visibleTags = showAllTags ? tags : tags.slice( 0, VISIBLE_TAGS );
    const hiddenCount = tags.length - visibleTags.length;
    const pickable = availableTags.filter(
        ( tag ) => ! tags.some( ( current ) => current.id === tag.id )
    );

    return (
        <TableRow className="group">
            <TableCell>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-default font-mono text-xs text-muted-foreground">
                                { subscriber.token?.slice( 0, 5 ) }•••••
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            <p className="max-w-[300px] break-all font-mono text-xs">
                                { subscriber.token }
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </TableCell>

            <TableCell>
                <div className="min-w-32 max-w-56">
                    <p className="truncate font-medium text-foreground">
                        { subscriber.city || subscriber.country || 'Unknown' }
                    </p>
                    { subscriber.city && subscriber.country ? (
                        <p className="truncate text-xs text-muted-foreground">
                            { subscriber.country }
                        </p>
                    ) : null }
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2 text-sm text-foreground">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <BrowserIcon
                            browser={ subscriber.browser || '' }
                            className="h-3.5 w-3.5"
                        />
                    </span>
                    <span className="whitespace-nowrap capitalize">
                        { subscriber.browser || '—' }
                    </span>
                </div>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2 text-sm text-foreground">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <DeviceIcon
                            device={ subscriber.device }
                            className="h-3.5 w-3.5"
                        />
                    </span>
                    <span className="capitalize">
                        { subscriber.device || '—' }
                    </span>
                </div>
            </TableCell>

            <TableCell className="font-mono text-xs text-muted-foreground">
                { subscriber.ip || '—' }
            </TableCell>

            <TableCell>
                <div className="flex min-w-[120px] flex-wrap items-center gap-1">
                    { visibleTags.map( ( tag ) => (
                        <span
                            key={ tag.id }
                            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                        >
                            <TagIcon className="h-2.5 w-2.5" aria-hidden />
                            { tag.name }
                            <button
                                type="button"
                                className="cursor-pointer rounded-full hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                onClick={ () => {
                                    onRemoveTag( tag );
                                } }
                                aria-label={ `Remove tag ${ tag.name }` }
                                title={ `Remove tag ${ tag.name }` }
                            >
                                <X className="h-2.5 w-2.5" aria-hidden />
                            </button>
                        </span>
                    ) ) }
                    { hiddenCount > 0 ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        type="button"
                                        className="inline-flex cursor-pointer items-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        onClick={ () => {
                                            setShowAllTags( true );
                                        } }
                                        aria-label={ `Show all ${ tags.length } tags` }
                                    >
                                        +{ hiddenCount } more
                                    </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-64">
                                    { tags
                                        .map( ( tag ) => tag.name )
                                        .join( ', ' ) }
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : null }
                    { isAddingTag ? (
                        <div className="flex items-center gap-1">
                            <Select
                                value={ selectedTagId }
                                onValueChange={ ( value ) => {
                                    onSelectTag( value );
                                } }
                            >
                                <SelectTrigger
                                    aria-label="Tag to add"
                                    className="h-7 w-36 rounded-md px-2 text-xs"
                                >
                                    <SelectValue placeholder="Pick a tag" />
                                </SelectTrigger>
                                <SelectContent>
                                    { pickable.map( ( tag ) => (
                                        <SelectItem
                                            key={ tag.id }
                                            value={ String( tag.id ) }
                                            className="text-xs"
                                        >
                                            { tag.name }
                                        </SelectItem>
                                    ) ) }
                                </SelectContent>
                            </Select>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-primary hover:bg-primary/10 hover:text-primary"
                                disabled={ ! selectedTagId }
                                aria-label="Add tag"
                                title="Add"
                                onClick={ () => {
                                    onAddTag();
                                } }
                            >
                                <Plus className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                            <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                aria-label="Cancel"
                                title="Cancel"
                                onClick={ () => {
                                    onCancelAddTag();
                                } }
                            >
                                <X className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                        </div>
                    ) : null }
                    { ! isAddingTag && ! isPaidUser ? (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <a
                                        href={ BILLING_URL }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-xs font-medium text-muted-foreground no-underline transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        <Lock className="h-3 w-3" aria-hidden />
                                        tag
                                    </a>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-56">
                                    Tags are available on Starter plans and
                                    above. Click to upgrade.
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : null }
                    { ! isAddingTag &&
                    isPaidUser &&
                    availableTags.length > 0 ? (
                        <button
                            type="button"
                            className="inline-flex cursor-pointer items-center gap-0.5 rounded-full border border-dashed border-border px-2 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title="Add tag"
                            onClick={ () => {
                                onStartAddTag();
                            } }
                        >
                            <Plus className="h-3 w-3" aria-hidden />
                            tag
                        </button>
                    ) : null }
                </div>
            </TableCell>

            <TableCell>
                <StatusChip active={ subscriber.active } />
            </TableCell>

            <TableCell className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
                { registered }
            </TableCell>

            <TableCell>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete subscriber"
                                className="h-8 w-8 text-destructive transition-opacity hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                disabled={ deleteDisabled }
                                onClick={ () => {
                                    onDelete();
                                } }
                            >
                                <Trash2 className="h-4 w-4" aria-hidden />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                            Delete subscriber
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </TableCell>
        </TableRow>
    );
}

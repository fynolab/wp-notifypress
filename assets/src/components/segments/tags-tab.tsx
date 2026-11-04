import { useState } from '@wordpress/element';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag as TagIcon, Tags, Trash2 } from 'lucide-react';

import { laravelRequest } from '../../lib/api';
import { getApiToken, hasApiToken } from '../../lib/settings';
import type { NotifyPressSettings } from '../../types';
import { useConfirm } from '../confirm-dialog';
import { Chip, EmptyState, SectionCard } from '../page-parts';
import type { ChipTone } from '../page-parts';
import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';
import type { TagOption } from './segment-parts';

const TAG_TYPE_TONE: Record< string, ChipTone > = {
    category: 'primary',
    interest: 'violet',
    custom: 'neutral',
};

// Row actions are always visible on touch screens, and on hover from `sm` up.
export const ROW_ACTIONS = 'flex items-center justify-end gap-1';

/**
 * The Tags tab of the Segments page: create a tag, list and delete tags.
 *
 * @param {Object}              props          Component props.
 * @param {NotifyPressSettings} props.settings Plugin settings.
 */
export function TagsTab( { settings }: { settings?: NotifyPressSettings } ) {
    const queryClient = useQueryClient();
    const [ confirm, confirmDialog ] = useConfirm();
    const [ name, setName ] = useState( '' );
    const [ type, setType ] = useState( 'category' );
    const token = getApiToken( settings );

    // Same key as the Subscribers page and the segment editor, so a tag made
    // here shows up there without a reload.
    const tagsQuery = useQuery( {
        queryKey: [ 'np-tags', token ],
        enabled: hasApiToken( settings ),
        queryFn: () =>
            laravelRequest< { data: TagOption[] } >( settings, '/tags' ),
    } );
    const tags = tagsQuery.data?.data || [];
    const loading = tagsQuery.isFetching && ! tagsQuery.data;

    const createMutation = useMutation( {
        mutationFn: () =>
            laravelRequest( settings, '/tags', {
                method: 'POST',
                body: { name, type },
            } ),
        onSuccess: () => {
            setName( '' );
            queryClient.invalidateQueries( { queryKey: [ 'np-tags' ] } );
        },
    } );

    const deleteMutation = useMutation( {
        mutationFn: ( id: number ) =>
            laravelRequest( settings, `/tags/${ id }`, {
                method: 'DELETE',
            } ),
        onSuccess: () => {
            queryClient.invalidateQueries( { queryKey: [ 'np-tags' ] } );
            queryClient.invalidateQueries( { queryKey: [ 'np-subscribers' ] } );
        },
    } );

    const handleCreate = () => {
        if ( ! name.trim() || createMutation.isPending ) {
            return;
        }

        createMutation.mutate();
    };

    const handleDelete = async ( tag: TagOption ) => {
        const count = Number( tag.subscribers_count || 0 );
        const carried =
            count > 0
                ? ` ${ count.toLocaleString() } subscriber${
                      count === 1 ? '' : 's'
                  } currently carry this tag.`
                : '';
        const confirmed = await confirm( {
            title: `Delete “${ tag.name }”?`,
            description: `The tag is removed from every subscriber who has it, and any segment built on it will stop matching them. This cannot be undone.${ carried }`,
            confirmLabel: 'Delete tag',
            destructive: true,
        } );

        if ( confirmed ) {
            deleteMutation.mutate( tag.id );
        }
    };

    return (
        <div className="space-y-6">
            { confirmDialog }
            <SectionCard
                title="Create a tag"
                description="Tags group subscribers by interest, category, or any custom criteria."
            >
                { createMutation.isError ? (
                    <Alert variant="destructive" className="mt-4">
                        <AlertDescription>
                            { createMutation.error.message }
                        </AlertDescription>
                    </Alert>
                ) : null }
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <Input
                        aria-label="Tag name"
                        className="h-10 flex-1 rounded-lg"
                        placeholder="Tag name e.g. marketing, breaking-news"
                        value={ name }
                        onChange={ ( event ) => {
                            setName( event.target.value );
                        } }
                        onKeyDown={ ( event ) => {
                            if ( event.key === 'Enter' ) {
                                handleCreate();
                            }
                        } }
                    />
                    <Select onValueChange={ setType } value={ type }>
                        <SelectTrigger
                            aria-label="Tag type"
                            className="h-10 w-full rounded-lg sm:w-40"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="category">Category</SelectItem>
                            <SelectItem value="interest">Interest</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        className="h-10 gap-2 px-4"
                        disabled={ createMutation.isPending || ! name.trim() }
                        onClick={ () => {
                            handleCreate();
                        } }
                    >
                        <Plus className="h-4 w-4" aria-hidden />
                        Create tag
                    </Button>
                </div>
            </SectionCard>

            <SectionCard
                title="All tags"
                description={ `${ tags.length } ${
                    tags.length === 1 ? 'tag' : 'tags'
                }` }
            >
                { ! loading && tags.length === 0 ? (
                    <EmptyState
                        icon={ <Tags className="h-5 w-5" /> }
                        title="No tags yet"
                    >
                        <p className="max-w-72 text-sm text-muted-foreground">
                            No tags yet. Create one above.
                        </p>
                    </EmptyState>
                ) : null }
                { loading ? (
                    <div className="mt-4 space-y-3" aria-hidden>
                        { Array.from( { length: 3 } ).map( ( _, index ) => (
                            <div
                                key={ index }
                                className="h-10 animate-pulse rounded-md bg-muted"
                            />
                        ) ) }
                    </div>
                ) : null }
                { tags.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="whitespace-nowrap">
                                        Tag
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap">
                                        Type
                                    </TableHead>
                                    <TableHead className="whitespace-nowrap text-right">
                                        Subscribers
                                    </TableHead>
                                    <TableHead className="w-[52px] whitespace-nowrap text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                { tags.map( ( tag ) => (
                                    <TableRow key={ tag.id } className="group">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
                                                    aria-hidden
                                                >
                                                    <TagIcon className="h-4 w-4" />
                                                </span>
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-foreground">
                                                        { tag.name }
                                                    </p>
                                                    { tag.slug ? (
                                                        <p className="truncate font-mono text-xs text-muted-foreground">
                                                            #{ tag.slug }
                                                        </p>
                                                    ) : null }
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                tone={
                                                    TAG_TYPE_TONE[
                                                        tag.type || ''
                                                    ] ?? 'neutral'
                                                }
                                                className="capitalize"
                                            >
                                                { tag.type || 'custom' }
                                            </Chip>
                                        </TableCell>
                                        <TableCell className="text-right font-semibold tabular-nums text-foreground">
                                            { Number(
                                                tag.subscribers_count || 0
                                            ).toLocaleString() }
                                        </TableCell>
                                        <TableCell>
                                            <div className={ ROW_ACTIONS }>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={ `Delete tag ${ tag.name }` }
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                    disabled={
                                                        deleteMutation.isPending
                                                    }
                                                    onClick={ () => {
                                                        handleDelete( tag );
                                                    } }
                                                >
                                                    <Trash2
                                                        className="h-4 w-4"
                                                        aria-hidden
                                                    />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) ) }
                            </TableBody>
                        </Table>
                    </div>
                ) : null }
            </SectionCard>
        </div>
    );
}

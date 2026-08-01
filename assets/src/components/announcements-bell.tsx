import { useState } from '@wordpress/element';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './utils';
import { getAnnouncements, markAllAnnouncementsRead } from '../lib/api';
import {
    getBootstrapSettings,
    getSettings,
    hasApiToken,
} from '../lib/settings';
import type { Announcement } from '../types';

export default function AnnouncementsBell() {
    const [ open, setOpen ] = useState( false );
    const queryClient = useQueryClient();

    const settingsQuery = useQuery( {
        queryKey: [ 'np-settings' ],
        queryFn: getSettings,
        initialData: getBootstrapSettings(),
    } );

    const announcementsQuery = useQuery( {
        queryKey: [ 'np-announcements' ],
        queryFn: () => getAnnouncements( settingsQuery.data ),
        enabled: hasApiToken( settingsQuery.data ),
    } );

    const markAllReadMutation = useMutation( {
        mutationFn: () => markAllAnnouncementsRead( settingsQuery.data ),
        onSuccess: () => {
            queryClient.setQueryData< {
                announcements: Announcement[];
                unread_count: number;
            } >( [ 'np-announcements' ], ( previous ) =>
                previous
                    ? {
                          announcements: previous.announcements.map(
                              ( announcement ) => ( {
                                  ...announcement,
                                  read: true,
                              } )
                          ),
                          unread_count: 0,
                      }
                    : previous
            );
        },
    } );

    if ( ! hasApiToken( settingsQuery.data ) ) {
        return null;
    }

    const announcements = announcementsQuery.data?.announcements ?? [];
    const unreadCount = announcementsQuery.data?.unread_count ?? 0;

    function handleOpenChange( next: boolean ) {
        setOpen( next );

        if ( next && unreadCount > 0 ) {
            markAllReadMutation.mutate();
        }
    }

    return (
        <Popover open={ open } onOpenChange={ handleOpenChange }>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
                    aria-label="Announcements"
                >
                    <Bell className="h-4 w-4" />
                    { unreadCount > 0 ? (
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                    ) : null }
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">
                        Announcements
                    </p>
                </div>
                <div className="max-h-96 overflow-y-auto">
                    { announcementsQuery.isSuccess &&
                    announcements.length === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                            No announcements yet.
                        </p>
                    ) : null }
                    { announcements.map( ( announcement ) => (
                        <div
                            key={ announcement.id }
                            className={ cn(
                                'border-b px-4 py-3 last:border-b-0',
                                ! announcement.read && 'bg-primary/5'
                            ) }
                        >
                            <p className="text-sm font-semibold text-foreground">
                                { announcement.title }
                            </p>
                            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                                { announcement.body }
                            </p>
                            { announcement.link_url ? (
                                <a
                                    href={ announcement.link_url }
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="mt-2 inline-block text-sm font-medium text-primary underline underline-offset-4"
                                >
                                    { announcement.link_label || 'Learn more' }
                                </a>
                            ) : null }
                        </div>
                    ) ) }
                </div>
            </PopoverContent>
        </Popover>
    );
}

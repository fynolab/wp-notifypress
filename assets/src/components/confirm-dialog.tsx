import { useCallback, useRef, useState } from '@wordpress/element';
import type { ReactElement } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from './ui/alert-dialog';
import { buttonVariants } from './ui/button';

export interface ConfirmOptions {
    title: string;
    description: string;
    confirmLabel?: string;
    destructive?: boolean;
}

export type Confirm = ( options: ConfirmOptions ) => Promise< boolean >;

/**
 * A promise-based stand-in for window.confirm(), shown as an AlertDialog.
 *
 * Render the returned dialog once in the component, then `await confirm()`
 * where window.confirm() would have been called.
 *
 * @return {Array} The confirm function, and the dialog element to render.
 */
export function useConfirm(): [ Confirm, ReactElement ] {
    const [ open, setOpen ] = useState( false );
    const [ options, setOptions ] = useState< ConfirmOptions | null >( null );
    const resolver = useRef< ( ( confirmed: boolean ) => void ) | null >(
        null
    );

    const confirm = useCallback< Confirm >( ( next ) => {
        setOptions( next );
        setOpen( true );

        return new Promise< boolean >( ( resolve ) => {
            resolver.current = resolve;
        } );
    }, [] );

    // Resolves once: the action's click settles true before the dialog's
    // close settles false, and the second call finds no resolver.
    const settle = ( confirmed: boolean ) => {
        resolver.current?.( confirmed );
        resolver.current = null;
        setOpen( false );
    };

    const dialog = (
        <AlertDialog
            open={ open }
            onOpenChange={ ( isOpen ) => {
                if ( ! isOpen ) {
                    settle( false );
                }
            } }
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{ options?.title }</AlertDialogTitle>
                    <AlertDialogDescription>
                        { options?.description }
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        className={
                            options?.destructive
                                ? buttonVariants( { variant: 'destructive' } )
                                : undefined
                        }
                        onClick={ () => settle( true ) }
                    >
                        { options?.confirmLabel ?? 'Confirm' }
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return [ confirm, dialog ];
}

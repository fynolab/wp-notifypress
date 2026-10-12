import React, { ReactElement } from 'react';
import ChromeIcon from './ChromeIcon';
import { Card, CardTitle } from '../../ui/card';
import { cn } from '../../utils';
import { defaultBellIcon } from './shared';
import WindowsTaskBar from './WindowsTaskBar';

type NotificationProps = {
    cardTitle: string;
    title: string;
    message: string;
    classes?: string;
    icon?: string;
};

const ChromeWindows = ( {
    cardTitle,
    title,
    message,
    classes = '',
    icon,
}: NotificationProps ): ReactElement => {
    return (
        <Card
            className={ cn(
                classes,
                'border-none shadow-none bg-transparent'
            ) }
        >
            <CardTitle className="font-[500] leading-none mb-3">
                { cardTitle }
            </CardTitle>

            { /* Windows 11 desktop wrapper */ }
            <div className="relative max-w-[370px] rounded-xl overflow-hidden">
                <div
                    className="relative"
                    style={ {
                        background:
                            'linear-gradient(135deg, #1a3a5c 0%, #1e4976 40%, #154360 70%, #0d2f47 100%)',
                    } }
                >
                    { /* Desktop area — notification toast bottom-right */ }
                    <div className="px-3 pt-3 pb-2 flex justify-end">
                        { /* Windows 11 toast notification */ }
                        <div
                            className="w-full relative rounded-lg overflow-hidden"
                            style={ {
                                background: 'rgba(36,36,48,0.92)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                            } }
                        >
                            { /* Top accent line */ }
                            <div
                                className="h-[2px] w-full"
                                style={ {
                                    background:
                                        'linear-gradient(90deg, #4fc3f7, #0078d4)',
                                } }
                            />

                            <div className="p-3">
                                { /* App row */ }
                                <div className="flex items-center gap-1.5 mb-2">
                                    <ChromeIcon width={ 14 } height={ 14 } />
                                    <span className="text-[10px] font-semibold text-white/50 uppercase tracking-widest">
                                        Chrome • now
                                    </span>
                                </div>

                                { /* Content */ }
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-semibold leading-tight text-white truncate">
                                            { title }
                                        </p>
                                        <p className="text-[11.5px] leading-snug text-white/70 mt-0.5 line-clamp-2">
                                            { message }
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-white/10">
                                        <img
                                            src={
                                                icon ? icon : defaultBellIcon
                                            }
                                            alt="icon"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            { /* Action buttons */ }
                            <div className="flex border-t border-white/10">
                                <button
                                    className="flex-1 text-[11px] font-medium py-1.5 text-white/60 hover:bg-white/5 transition-colors text-center border-r border-white/10"
                                    type="button"
                                >
                                    Close
                                </button>
                                <button
                                    className="flex-1 text-[11px] font-semibold py-1.5 text-[#4fc3f7] hover:bg-white/5 transition-colors text-center"
                                    type="button"
                                >
                                    Open
                                </button>
                            </div>
                        </div>
                    </div>

                    { /* Windows taskbar */ }
                    <WindowsTaskBar />
                </div>
            </div>
        </Card>
    );
};

export default ChromeWindows;

import React, { ReactElement } from 'react';
import FirefoxIcon from './FirefoxIcon';
import { Card, CardTitle } from '../../ui/card';
import { cn } from '../../utils';
import { defaultBellIcon } from './shared';
import MacMenuBar from './MacMenuBar';

type NotificationProps = {
    cardTitle: string;
    title: string;
    message: string;
    classes?: string;
    icon?: string;
};

const FirefoxMac = ( {
    cardTitle,
    title,
    message,
    classes = '',
    icon,
}: NotificationProps ): ReactElement => {
    return (
        <Card className={ cn( classes, 'border-none shadow-none bg-transparent' ) }>
            <CardTitle className="font-[500] leading-none mb-3">
                { cardTitle }
            </CardTitle>

            {/* macOS Tahoe desktop wrapper */}
            <div className="relative max-w-[370px] rounded-2xl overflow-hidden">
                {/* Neutral macOS Tahoe wallpaper */}
                <div
                    className="relative"
                    style={{
                        background:
                            'linear-gradient(135deg, #dfe9f3 0%, #e8edf2 40%, #d6e4ec 70%, #cdd8e3 100%)',
                    }}
                >
                    {/* macOS menu bar */}
                    <MacMenuBar />

                    {/* Desktop area */}
                    <div className="px-3 pt-2 pb-3">
                        {/* Liquid Glass notification card */}
                        <div
                            className="relative rounded-2xl overflow-hidden"
                            style={{
                                background: 'rgba(255,255,255,0.55)',
                                backdropFilter: 'blur(40px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                                border: '1px solid rgba(255,255,255,0.75)',
                                boxShadow:
                                    '0 8px 32px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.9) inset',
                            }}
                        >
                            {/* Prismatic specular highlight */}
                            <div
                                className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl"
                                style={{
                                    background:
                                        'linear-gradient(90deg, transparent 0%, rgba(120,180,255,0.6) 25%, rgba(255,255,255,0.95) 50%, rgba(255,160,200,0.5) 75%, transparent 100%)',
                                }}
                            />

                            <div className="px-3 pt-3 pb-3">
                                {/* Content row — icon left, text middle, thumbnail right */}
                                <div className="flex items-start gap-2.5">
                                    {/* Browser icon */}
                                    <div className="flex items-center justify-center w-6 h-6 flex-shrink-0 mt-0.5">
                                        <FirefoxIcon width={ 24 } height={ 24 } />
                                    </div>

                                    {/* Text */}
                                    <div className="flex-1 min-w-0">
                                        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                                            Firefox • now
                                        </span>
                                        <p className="text-[13px] font-semibold leading-tight text-gray-900 truncate mt-0.5">
                                            { title }
                                        </p>
                                        <p className="text-[11.5px] leading-snug text-gray-600 mt-0.5 line-clamp-2">
                                            { message }
                                        </p>
                                    </div>

                                    {/* Notification thumbnail */}
                                    <div
                                        className="flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-black/8"
                                        style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                                    >
                                        <img
                                            src={ icon ? icon : defaultBellIcon }
                                            alt="notification-icon"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div
                                className="absolute inset-x-0 bottom-0 h-[1px]"
                                style={{ background: 'rgba(255,255,255,0.6)' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default FirefoxMac;

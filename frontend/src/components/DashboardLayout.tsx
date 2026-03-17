'use client';

import React, { useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Blueprint,
    SignOut,
    Gauge,
    PlusCircle,
    BookOpenText,
    List,
    Cube,
} from '@phosphor-icons/react';
import { api, clearAuthToken, getAuthToken } from '@/lib/api';

interface MenuItem {
    icon: React.ElementType;
    label: string;
    path: string;
}

interface DashboardLayoutProps {
    children: ReactNode;
}

const MIN_WIDTH = 60;
const COLLAPSED_WIDTH = 64;
const DEFAULT_WIDTH = 240;
const MAX_WIDTH = 320;

const menuItems: MenuItem[] = [
    { icon: Gauge, label: 'Dashboard', path: '/dashboard' },
    { icon: PlusCircle, label: 'New Project', path: '/dashboard/new' },
    { icon: BookOpenText, label: 'Templates', path: '/dashboard/templates' },
];

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const router = useRouter();
    const pathname = usePathname();

    const [authReady, setAuthReady] = useState(false);
    const [userInitial, setUserInitial] = useState('A');
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        if (typeof window === 'undefined') {
            return DEFAULT_WIDTH;
        }
        const savedWidth = window.localStorage.getItem('archSidebarWidth');
        const parsed = savedWidth ? parseInt(savedWidth, 10) : DEFAULT_WIDTH;
        return Number.isFinite(parsed) ? parsed : DEFAULT_WIDTH;
    });
    const [isResizing, setIsResizing] = useState(false);
    const [isHidden, setIsHidden] = useState(() => {
        if (typeof window === 'undefined') {
            return false;
        }
        return window.localStorage.getItem('archSidebarHidden') === 'true';
    });
    const sidebarRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let isActive = true;

        async function checkAuth() {
            if (!getAuthToken()) {
                router.replace('/login');
                return;
            }

            try {
                const user = await api.me();
                if (!isActive) return;
                const label = (user.display_name || user.email || 'A').trim();
                setUserInitial(label ? label[0].toUpperCase() : 'A');
                setAuthReady(true);
            } catch {
                clearAuthToken();
                if (isActive) {
                    router.replace('/login');
                }
            }
        }

        checkAuth();
        return () => {
            isActive = false;
        };
    }, [router]);

    useEffect(() => {
        if (!isResizing) {
            localStorage.setItem('archSidebarWidth', sidebarWidth.toString());
            localStorage.setItem('archSidebarHidden', isHidden.toString());
        }
    }, [sidebarWidth, isHidden, isResizing]);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e: MouseEvent) => {
        if (isResizing && sidebarRef.current) {
            const newWidth = e.clientX;
            if (newWidth < MIN_WIDTH) {
                setIsHidden(true);
                setSidebarWidth(COLLAPSED_WIDTH);
            } else {
                setIsHidden(false);
                const clampedWidth = Math.min(MAX_WIDTH, Math.max(COLLAPSED_WIDTH, newWidth));
                setSidebarWidth(clampedWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResizing);
        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [resize, stopResizing]);

    const isCollapsed = sidebarWidth < 150;
    const showLabels = sidebarWidth >= 150 && !isHidden;

    const handleLogout = async () => {
        try {
            await api.logout();
        } catch {
            // Ignore logout network errors and always clear local auth.
        }
        clearAuthToken();
        router.replace('/login');
    };

    if (!authReady) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-blue-500 animate-spin" />
                    <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Authenticating...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 flex">
            <div className="scanlines" />

            {/* Sidebar */}
            <aside
                ref={sidebarRef}
                className={`bg-slate-900 border-r border-slate-800 h-screen sticky top-0 flex flex-col z-50 transition-all ${isResizing ? 'transition-none' : 'duration-200'
                    } ${isHidden ? 'w-0 overflow-hidden border-0' : ''}`}
                style={{ width: isHidden ? 0 : sidebarWidth }}
            >
                {/* Header */}
                <div className={`p-4 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
                    <Blueprint size={28} weight="duotone" className="text-blue-400 flex-shrink-0" />
                    {showLabels && (
                        <div className="overflow-hidden">
                            <h1 className="font-chivo font-bold text-sm uppercase tracking-wider whitespace-nowrap">ArchDesign AI</h1>
                            <p className="text-xs text-slate-500 font-mono">Blueprint Generator</p>
                        </div>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 overflow-y-auto overflow-x-hidden">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path));
                            return (
                                <li key={item.path}>
                                    <button
                                        onClick={() => router.push(item.path)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm transition-all duration-150 text-sm font-medium ${isCollapsed ? 'justify-center' : ''
                                            } ${isActive
                                                ? 'text-blue-400 bg-blue-950/50 border-l-2 border-blue-400'
                                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                                            }`}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <Icon size={20} weight="duotone" className="flex-shrink-0" />
                                        {showLabels && <span className="truncate">{item.label}</span>}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Footer */}
                <div className="p-2 border-t border-slate-800">
                    <div className={`px-3 py-2 text-xs font-mono text-slate-600 ${isCollapsed ? 'text-center' : ''}`}>
                        {showLabels ? 'Powered by Groq AI' : <Cube size={16} className="mx-auto" />}
                    </div>
                </div>

                {/* Resize Handle */}
                <div
                    className="absolute right-0 top-0 h-full w-1 cursor-ew-resize hover:bg-blue-500/50 active:bg-blue-500 transition-colors z-50"
                    onMouseDown={startResizing}
                    style={{ transform: 'translateX(50%)' }}
                />
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto relative z-10">
                {/* Header */}
                <div className="backdrop-blur-md bg-slate-950/80 border-b border-slate-700 sticky top-0 z-40">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-4">
                            {isHidden && (
                                <button
                                    onClick={() => { setIsHidden(false); setSidebarWidth(DEFAULT_WIDTH); }}
                                    className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                                    title="Show Sidebar"
                                >
                                    <List size={24} />
                                </button>
                            )}
                            <div>
                                <h2 className="font-chivo font-bold text-xl uppercase tracking-wider">Architecture Studio</h2>
                                <p className="text-xs text-slate-400 font-mono mt-1">AI-Powered Design & Blueprint Generation</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase tracking-wider text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-sm transition-colors"
                                title="Sign Out"
                            >
                                <SignOut size={14} />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                            <div className="h-9 w-9 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-cyan-600 text-white font-bold text-sm shadow-lg">
                                {userInitial}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>

            {isResizing && (
                <div className="fixed inset-0 z-[100] cursor-ew-resize" />
            )}
        </div>
    );
}

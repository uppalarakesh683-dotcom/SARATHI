'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Brain,
  FileText,
  Target,
  FileCheck2,
  Mic,
  TrendingUp,
  Award,
  Network,
  Settings,
  X,
  Sparkles,
} from 'lucide-react';
import { SarathiLogo } from '@/components/brand/SarathiLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavGroup {
  category: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
  }[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    category: 'LEARN',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'AI Tutor', href: '/tutor', icon: Brain },
      { label: 'Materials', href: '/materials', icon: FileText },
    ],
  },
  {
    category: 'PRACTICE',
    items: [
      { label: 'Practice', href: '/practice', icon: Target },
      { label: 'Mock Exams', href: '/exams', icon: FileCheck2 },
    ],
  },
  {
    category: 'CAREER',
    items: [
      { label: 'AI Interview', href: '/interview', icon: Mic },
    ],
  },
  {
    category: 'INSIGHTS',
    items: [
      { label: 'Progress', href: '/progress', icon: TrendingUp },
      { label: 'Readiness', href: '/readiness', icon: Award },
      { label: 'Knowledge Map', href: '/knowledge-map', icon: Network },
    ],
  },
  {
    category: 'SYSTEM',
    items: [
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top Logo and Brand */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center group">
            <SarathiLogo size="sm" animated glow="subtle" />
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation list */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
          {NAV_GROUPS.map((group) => (
            <div key={group.category} className="space-y-1">
              <div className="px-3 pb-1 text-[10px] font-mono tracking-wider text-slate-500 uppercase font-semibold">
                {group.category}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`group flex items-center px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-300 border border-cyan-500/30 shadow-xs'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mr-3 transition-colors ${
                        isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Clean, User-Friendly Status Bar (No technical debug info) */}
        <div className="p-3 m-3 rounded-xl bg-slate-900/50 border border-slate-800/80 text-xs">
          <div className="flex items-center justify-between text-slate-300">
            <span className="flex items-center text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
              SARATHI is ready
            </span>
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          </div>
        </div>
      </aside>
    </>
  );
}

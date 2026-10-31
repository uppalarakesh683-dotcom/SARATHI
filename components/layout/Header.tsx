'use client';

import React, { useState } from 'react';
import { Menu, Sparkles, BookOpen, Bell } from 'lucide-react';
import { useProgress } from '@/hooks/use-progress';
import { SarathiLogo } from '@/components/brand/SarathiLogo';
import Link from 'next/link';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { profile, readiness, targetExamLabel, isMounted } = useProgress();
  const [showNotification, setShowNotification] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 border-b border-slate-800/80 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile Menu Toggle & Brand context */}
      <div className="flex items-center space-x-3">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile Brand Logo */}
        <Link href="/dashboard" className="lg:hidden flex items-center">
          <SarathiLogo size="xs" showWordmark={true} />
        </Link>

        {/* Current Active Goal Chip */}
        <Link
          href={isMounted && targetExamLabel ? '/settings' : '/dashboard'}
          className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs transition-colors group"
          title={isMounted && targetExamLabel ? 'Edit your learning target in settings' : 'Set your learning target'}
        >
          <BookOpen className="w-3.5 h-3.5 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          <span className="text-slate-400">Target:</span>
          <span className="text-slate-200 font-medium group-hover:text-white transition-colors">
            {isMounted && targetExamLabel ? targetExamLabel : 'Set Your Learning Target'}
          </span>
          {isMounted && profile?.currentLevel && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/50">
              {profile.currentLevel}
            </span>
          )}
        </Link>
      </div>

      {/* Right controls */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        {/* Readiness Pill if calculated */}
        {isMounted && readiness.status === 'calculated' && readiness.overallScore > 0 && (
          <Link
            href="/readiness"
            className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300 hover:bg-cyan-900/40 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Readiness:</span>
            <span className="font-bold text-cyan-200">{readiness.overallScore}%</span>
          </Link>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotification(!showNotification)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-colors relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400" />
          </button>

          {showNotification && (
            <div className="absolute right-0 mt-2 w-72 p-3 bg-slate-900 border border-slate-800 rounded-xl shadow-xl z-50 text-xs animate-fadeIn">
              <div className="font-semibold text-slate-200 mb-1">Learning Updates</div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                Your personalized study recommendations and diagnostic evaluations adapt continuously as you practice.
              </p>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <Link
          href="/settings"
          className="flex items-center space-x-2 p-1 pl-2 pr-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 transition-colors"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
            {isMounted && profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
          </div>
          <span className="hidden md:inline text-xs font-medium text-slate-300 truncate max-w-[100px]">
            {isMounted && profile?.name ? profile.name : 'Student'}
          </span>
        </Link>
      </div>
    </header>
  );
}

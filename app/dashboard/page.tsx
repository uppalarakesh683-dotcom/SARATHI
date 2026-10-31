'use client';

import React, { useState, useEffect } from 'react';
import { SarathiIntro } from '@/components/intro/SarathiIntro';
import { AppShell } from '@/components/layout/AppShell';
import { Dashboard } from '@/components/dashboard/Dashboard';

export default function DashboardPage() {
  const [introFinished, setIntroFinished] = useState(false);
  const [showPlatform, setShowPlatform] = useState(false);
  const [platformVisible, setPlatformVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('intro') === 'true') {
        sessionStorage.removeItem('sarathi_intro_seen');
        setIntroFinished(false);
        setShowPlatform(false);
        setPlatformVisible(false);
        return;
      }
      const seen = sessionStorage.getItem('sarathi_intro_seen');
      if (seen === 'true') {
        setIntroFinished(true);
        setShowPlatform(true);
        setPlatformVisible(true);
      }
    }
  }, []);

  const handleStartReveal = () => {
    // Mount platform at opacity-0, then smoothly fade in
    setShowPlatform(true);
    setTimeout(() => {
      setPlatformVisible(true);
    }, 50);
  };

  const handleCompleteIntro = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sarathi_intro_seen', 'true');
    }
    setIntroFinished(true);
    setShowPlatform(true);
    setPlatformVisible(true);
  };

  return (
    <>
      {!introFinished && (
        <SarathiIntro
          onStartReveal={handleStartReveal}
          onComplete={handleCompleteIntro}
        />
      )}
      {showPlatform && (
        <div
          className={`transition-all duration-1000 ease-out ${
            platformVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.99]'
          }`}
        >
          <AppShell>
            <Dashboard />
          </AppShell>
        </div>
      )}
    </>
  );
}

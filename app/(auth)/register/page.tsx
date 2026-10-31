'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { saveUserProfile } from '@/lib/db/client';
import { SarathiLogo } from '@/components/brand/SarathiLogo';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserProfile({
      id: `usr-${Date.now()}`,
      name: name.trim() || 'Aspirant',
      email: email.trim() || 'student@sarathi.ai',
      targetExam: 'gate_cse',
      targetExamLabel: 'GATE CSE (DBMS)',
      currentLevel: 'intermediate',
      targetDate: '2026-02-15',
      dailyStudyMinutes: 60,
      completedOnboarding: true,
      totalStudyMinutes: 0,
      streakDays: 1,
      createdAt: new Date().toISOString(),
    });
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.1),rgba(255,255,255,0))] pointer-events-none" />

      <div className="w-full max-w-md p-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-glass space-y-6 relative z-10 animate-fadeIn">
        <div className="text-center space-y-3 flex flex-col items-center">
          <SarathiLogo size="md" glow="bright" animated />
          <p className="text-xs text-slate-400">
            Launch your personalized learning intelligence operating system
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="text-xs font-mono text-slate-300">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              required
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="rahul@example.com"
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              required
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 text-slate-950 font-bold text-sm shadow-neon-cyan transition-all flex items-center justify-center space-x-2"
          >
            <span>REGISTER & ENTER PLATFORM</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center text-xs text-slate-400">
          <span>Already have an account? </span>
          <Link href="/login" className="text-cyan-400 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}


import type { Metadata } from 'next';
import './globals.css';
import { LearningTargetProvider } from '@/components/providers/LearningTargetProvider';

export const metadata: Metadata = {
  title: 'SARATHI — AI-Powered Personalized Learning & Assessment Intelligence',
  description:
    'Next-generation AI learning operating system guiding competitive exams, university assessments, and interview readiness.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        <LearningTargetProvider>
          {children}
        </LearningTargetProvider>
      </body>
    </html>
  );
}

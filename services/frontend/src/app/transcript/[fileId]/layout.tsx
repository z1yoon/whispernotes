'use client';

import { ReactNode } from 'react';

interface TranscriptLayoutProps {
  children: ReactNode;
}

export default function TranscriptLayout({ children }: TranscriptLayoutProps) {
  return <>{children}</>;
} 
'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/Header'

export function ConditionalHeader() {
  const pathname = usePathname() || '/'
  const noHeaderPaths = ['/', '/login', '/signup']

  if (noHeaderPaths.includes(pathname)) {
    return null
  }

  return <Header />
} 
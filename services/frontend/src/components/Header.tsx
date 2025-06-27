'use client'

import Link from 'next/link'
import { Mic, User, LogOut } from 'lucide-react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { LogoText } from './AuthStyles'

export function Header() {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  // Hide header on the landing page ("/") for a pixel-perfect match with the Figma cover
  if (pathname === '/') {
    return null
  }

  const handleLogout = () => {
    signOut({ callbackUrl: '/' })
  }

  return (
    <header className="absolute top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#8850F2] to-[#A855F7] rounded-full flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <LogoText>WhisperNotes</LogoText>
        </Link>

        <nav className="flex items-center gap-4">
          {session ? (
            <div className="flex items-center gap-4">
              <Link href="/transcripts" className="px-4 py-2 rounded-md font-semibold text-white border border-white/20 bg-white/10 hover:bg-white/15 transition-colors">
                My Transcripts
              </Link>

              {session.user?.role === 'admin' && (
                <Link href="/admin" className="px-4 py-2 rounded-md font-semibold text-white border border-white/20 bg-white/10 hover:bg-white/15 transition-colors">
                  Admin
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="px-3 py-2 bg-gradient-to-r from-gray-700 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 font-medium"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="px-4 py-2 rounded-md font-semibold text-white border border-white/20 bg-transparent hover:bg-white/10 transition-colors">
                Login
              </Link>
              <Link href="/signup" className="px-4 py-2 rounded-md font-semibold text-white bg-gradient-to-r from-[#8850F2] to-[#A855F7] hover:opacity-90 transition-opacity">
                Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
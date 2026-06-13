'use client'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { useEffect, useState } from 'react'
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard,
  BedDouble,
  Tent,
  CalendarDays,
  QrCode,
  CreditCard,
  LogOut,
  Menu,
  X,
  Users,
  Settings,
  Waves,
  Image,
  Sparkles,
} from 'lucide-react'

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Rooms', href: '/admin/rooms', icon: BedDouble },
  { name: 'Tents', href: '/admin/tents', icon: Tent },
  { name: 'Experiences', href: '/admin/experiences', icon: Sparkles },
  { name: 'Batch Upload', href: '/admin/batch-upload', icon: Image },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

// Timeout helper defined outside component to avoid TSX generic parsing issues
function withTimeout(promise: Promise<any>, ms: number): Promise<any> {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ])
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false
    const checkAuth = async () => {
      try {
        // Race all auth checks against a single timeout
        const timeout = new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 3000)
        )

        const sessionResult = await Promise.race([supabase.auth.getSession(), timeout])
        if (cancelled) return
        const session = (sessionResult as any)?.data?.session
        if (!session) {
          router.push('/admin/login')
          return
        }

        // Check user_roles table first
        const roleResult = await Promise.race([
          supabase.from('user_roles').select('role').eq('user_id', session.user.id).single() as any,
          timeout,
        ]).catch(() => null)
        if (cancelled) return

        if (roleResult && !(roleResult as any).error && (roleResult as any).data?.role === 'admin') {
          setUserEmail(session.user.email || '')
          setLoading(false)
          return
        }

        // Fallback: check profiles table
        const profileResult = await Promise.race([
          supabase.from('profiles').select('role').eq('id', session.user.id).single() as any,
          timeout,
        ]).catch(() => null)
        if (cancelled) return

        if (profileResult && !(profileResult as any).error && (profileResult as any).data?.role === 'admin') {
          setUserEmail(session.user.email || '')
          setLoading(false)
          return
        }

        // Not an admin
        router.push('/')
      } catch {
        if (!cancelled) {
          router.push('/admin/login')
        }
      }
    }
    checkAuth()
    return () => { cancelled = true }
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#0A3D62] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => router.push('/admin/login')}
            className="px-4 py-2 bg-[#0A3D62] text-white rounded-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdminErrorBoundary>
      <div className="min-h-screen bg-gray-100">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-[#0A3D62] text-white rounded-lg shadow-lg"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-30 w-64 bg-[#082032] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex flex-col h-full">
            {/* Sidebar header */}
            <div className="p-4 border-b border-[#0A3D62]">
              <div className="flex items-center justify-between">
                <Link href="/admin" className="flex items-center gap-2">
                  <Waves className="w-6 h-6 text-[#D4AF37]" />
                  <div>
                    <h2 className="text-lg font-bold">Atican Beach</h2>
                    <p className="text-xs text-gray-400">Admin Portal</p>
                  </div>
                </Link>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1 hover:bg-[#0A3D62] rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4">
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[#0A3D62] text-white'
                        : 'text-gray-300 hover:bg-[#0A3D62]/50 hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            {/* User info & logout */}
            <div className="p-4 border-t border-[#0A3D62]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#F97316] rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-white">
                    {userEmail.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userEmail}</p>
                  <p className="text-xs text-gray-400">Administrator</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-400/10 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="lg:ml-64 min-h-screen">
          <div className="p-4 md:p-8 pt-16 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </AdminErrorBoundary>
  )
}
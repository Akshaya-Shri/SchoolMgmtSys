'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  BookOpen, 
  ClipboardList, 
  LogOut, 
  FileSpreadsheet,
  FileCheck,
  UserCheck
} from 'lucide-react'

interface SidebarProps {
  role: 'STAFF' | 'STUDENT'
  name: string
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function Sidebar({ role, name, isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const staffLinks = [
    { name: 'Dashboard', href: '/staff/dashboard', icon: LayoutDashboard },
    { name: 'Students', href: '/staff/students', icon: Users },
    { name: 'Attendance', href: '/staff/attendance', icon: CalendarCheck },
    { name: 'Exam Marks', href: '/staff/marks', icon: FileSpreadsheet },
    { name: 'Work Done', href: '/staff/work-done', icon: BookOpen },
    { name: 'Homework', href: '/staff/homework', icon: ClipboardList },
    { name: 'Leave Requests', href: '/staff/leave-requests', icon: UserCheck },
  ]

  const studentLinks = [
    { name: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
    { name: 'Homework', href: '/student/homework', icon: ClipboardList },
    { name: 'Attendance', href: '/student/attendance', icon: CalendarCheck },
    { name: 'Marks', href: '/student/marks', icon: FileCheck },
    { name: 'Leave Requests', href: '/student/leave-requests', icon: UserCheck },
  ]

  const links = role === 'STAFF' ? staffLinks : studentLinks

  const handleLogout = async () => {
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (res.ok) {
        router.refresh()
        router.push('/login')
      }
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-all duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 flex-col border-r border-slate-100 bg-white shadow-xl shadow-slate-100/50 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header/Logo */}
        <div className="flex h-20 items-center justify-between border-b border-slate-50 px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-lg shadow-md shadow-indigo-200">
              S
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-slate-800">Govt Digital School</span>
              <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-widest">Management</p>
            </div>
          </Link>
          <button 
            onClick={() => setIsOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 lg:hidden"
          >
            &times;
          </button>
        </div>

        {/* User Card */}
        <div className="mx-4 my-6 rounded-2xl bg-gradient-to-br from-indigo-50/50 to-violet-50/50 p-4 border border-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white font-semibold shadow-inner">
              {name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
              <span className="inline-block rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 tracking-wide">
                {role}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
          {links.map((link) => {
            const Icon = link.icon
            const isActive = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`} />
                {link.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout Footer */}
        <div className="border-t border-slate-50 p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-rose-500 transition-all duration-200 hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-5 w-5 text-rose-400" />
            Logout
          </button>
        </div>
      </aside>
    </>
  )
}

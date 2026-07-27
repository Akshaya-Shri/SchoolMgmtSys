'use client'

import { Menu, Calendar } from 'lucide-react'
import { useEffect, useState } from 'react'

interface HeaderProps {
  name: string
  setSidebarOpen: (open: boolean) => void
}

export default function Header({ name, setSidebarOpen }: HeaderProps) {
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    // Format: "Monday, 27 July 2026"
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    setDateStr(new Date().toLocaleDateString('en-US', options))
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-100 bg-white/80 px-6 backdrop-blur-md lg:px-8">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="rounded-xl border border-slate-100 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 lg:hidden shadow-sm"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Date display (Desktop) */}
      <div className="hidden sm:flex items-center gap-2.5 text-slate-500 text-sm font-medium">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Calendar className="h-4 w-4" />
        </div>
        <span>{dateStr || 'Loading date...'}</span>
      </div>

      {/* Welcome & Profile */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-widest block">Welcome</span>
          <span className="text-sm font-bold text-slate-800">{name}</span>
        </div>
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-white flex items-center justify-center font-bold text-sm shadow shadow-indigo-100">
          {name.charAt(0)}
        </div>
      </div>
    </header>
  )
}

'use client'

import { useState } from 'react'
import Sidebar from '@/components/dashboard/Sidebar'
import Header from '@/components/dashboard/Header'
import { SessionPayload } from '@/lib/auth/session'

interface StaffLayoutClientProps {
  session: SessionPayload
  children: React.ReactNode
}

export default function StaffLayoutClient({ session, children }: StaffLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <Sidebar 
        role="STAFF" 
        name={session.name} 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen} 
      />

      {/* Main Container */}
      <div className="flex flex-col lg:pl-72 min-h-screen">
        {/* Header */}
        <Header name={session.name} setSidebarOpen={setSidebarOpen} />

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

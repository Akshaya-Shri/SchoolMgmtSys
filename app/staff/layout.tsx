import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import StaffLayoutClient from './StaffLayoutClient'

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  
  if (!session || session.role !== 'STAFF') {
    redirect('/login')
  }

  return (
    <StaffLayoutClient session={session}>
      {children}
    </StaffLayoutClient>
  )
}

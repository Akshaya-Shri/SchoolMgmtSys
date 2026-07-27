import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import StudentLayoutClient from './StudentLayoutClient'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  
  if (!session || session.role !== 'STUDENT') {
    redirect('/login')
  }

  return (
    <StudentLayoutClient session={session}>
      {children}
    </StudentLayoutClient>
  )
}

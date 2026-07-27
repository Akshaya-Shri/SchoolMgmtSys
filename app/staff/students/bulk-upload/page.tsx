import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import BulkUploadClient from './BulkUploadClient'
import { AlertCircle } from 'lucide-react'

export default async function BulkUploadPage() {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    redirect('/login')
  }

  const assignments = await getStaffAssignments(session.staffId)
  
  if (!assignments.isClassTeacher || assignments.classTeacherClasses.length === 0) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center max-w-xl mx-auto mt-12 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-100">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-sm font-medium text-rose-700 leading-relaxed">
          You are not assigned as a Class Teacher. Only Class Teachers can access the Student Bulk Upload system to manage their assigned class.
        </p>
      </div>
    )
  }

  const classTeacherClass = assignments.classTeacherClasses[0]

  return (
    <BulkUploadClient classTeacherClass={classTeacherClass} />
  )
}

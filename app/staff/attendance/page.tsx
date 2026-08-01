import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import { prisma } from '@/lib/db'
import AttendanceClient from './AttendanceClient'

export default async function StaffAttendancePage() {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    redirect('/login')
  }

  const assignments = await getStaffAssignments(session.staffId)
  if (!assignments.isClassTeacher || assignments.classTeacherClasses.length === 0) {
    return (
      <div className="mx-auto mt-12 max-w-xl rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-100">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-sm font-medium text-rose-700 leading-relaxed">
          Only a class teacher can mark attendance for their assigned class.
        </p>
      </div>
    )
  }

  const classTeacherClass = assignments.classTeacherClasses[0]
  const students = await prisma.student.findMany({
    where: { classId: classTeacherClass.id },
    select: {
      id: true,
      name: true,
      admissionNumber: true,
      class: { select: { name: true } },
    },
    orderBy: { name: 'asc' },
  })

  return <AttendanceClient classTeacherClass={classTeacherClass} students={students} />
}

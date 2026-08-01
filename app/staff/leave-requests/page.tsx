import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import { prisma } from '@/lib/db'

export default async function StaffLeaveRequestsPage() {
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
          Only a class teacher can review leave requests for their class.
        </p>
      </div>
    )
  }

  const classTeacherClass = assignments.classTeacherClasses[0]
  const leaveRequests = await prisma.leaveRequest.findMany({
    where: {
      student: { classId: classTeacherClass.id },
    },
    include: {
      student: { select: { name: true, admissionNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Leave Requests</h1>
        <p className="mt-2 text-sm text-slate-500">Manage leave applications for {classTeacherClass.name}.</p>
      </div>

      {leaveRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">No leave requests available.</div>
      ) : (
        <div className="space-y-4">
          {leaveRequests.map((request: { id: string; student: { name: string; admissionNumber: string }; reason: string; startDate: Date; endDate: Date; status: string; remarks?: string | null }) => (
            <div key={request.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{request.student.name} • {request.student.admissionNumber}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{request.reason}</h3>
                </div>
                <div className="text-sm text-slate-500">
                  <p>{new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}</p>
                  <p className="mt-1 font-semibold text-slate-700">Status: {request.status}</p>
                </div>
              </div>
              {request.remarks && <p className="mt-3 text-sm text-slate-600">Remarks: {request.remarks}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

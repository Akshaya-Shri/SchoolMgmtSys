import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export default async function StudentLeavePage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT' || !session.studentId) {
    redirect('/login')
  }

  const leaveRequests = await prisma.leaveRequest.findMany({
    where: { studentId: session.studentId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Leave Requests</h1>
        <p className="mt-2 text-sm text-slate-500">Track your leave applications and teacher remarks.</p>
      </div>

      {leaveRequests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">No leave requests found.</div>
      ) : (
        <div className="space-y-4">
          {leaveRequests.map((request: { id: string; reason: string; startDate: Date; endDate: Date; status: string; remarks?: string | null }) => (
            <div key={request.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{request.status}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{request.reason}</h3>
                </div>
                <p className="text-sm text-slate-500">{new Date(request.startDate).toLocaleDateString()} to {new Date(request.endDate).toLocaleDateString()}</p>
              </div>
              {request.remarks && <p className="mt-3 text-sm text-slate-600">Remarks: {request.remarks}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import { prisma } from '@/lib/db'

export default async function StaffWorkDonePage() {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    redirect('/login')
  }

  const assignments = await getStaffAssignments(session.staffId)
  if (!assignments.isSubjectTeacher) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center max-w-xl mx-auto mt-12 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-sm text-rose-700">Subject teachers only can add work-done records for assigned classes and subjects.</p>
      </div>
    )
  }

  const workDone = await prisma.workDone.findMany({
    where: { staffId: session.staffId },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Work Done</h1>
        <p className="mt-2 text-sm text-slate-500">Track the topics covered for your assigned classes and subjects.</p>
      </div>

      {workDone.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">No work-done records found.</div>
      ) : (
        <div className="space-y-4">
          {workDone.map((item: { id: string; class: { name: string }; subject: { name: string }; topic: string; date: Date; description?: string | null }) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{item.class.name} • {item.subject.name}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{item.topic}</h3>
                </div>
                <p className="text-sm text-slate-500">{new Date(item.date).toLocaleDateString()}</p>
              </div>
              {item.description && <p className="mt-3 text-sm text-slate-600">{item.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

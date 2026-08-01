import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import { prisma } from '@/lib/db'

export default async function StaffHomeworkPage() {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    redirect('/login')
  }

  const assignments = await getStaffAssignments(session.staffId)
  if (!assignments.isSubjectTeacher) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center max-w-xl mx-auto mt-12 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-sm text-rose-700">Only subject teachers can create or manage homework for their assigned classes and subjects.</p>
      </div>
    )
  }

  const homework = await prisma.homework.findMany({
    where: { staffId: session.staffId },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
      attachments: true,
    },
    orderBy: { assignedDate: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Homework</h1>
        <p className="mt-2 text-sm text-slate-500">Allocate homework to your subject and class assignments securely.</p>
      </div>

      {homework.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">No homework allocated yet.</div>
      ) : (
        <div className="space-y-4">
          {homework.map((item: { id: string; class: { name: string }; subject: { name: string }; title: string; assignedDate: Date; dueDate: Date; description: string; attachments: { id: string; fileName: string }[] }) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{item.class.name} • {item.subject.name}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{item.title}</h3>
                </div>
                <div className="text-sm text-slate-500">
                  <p>Assigned: {new Date(item.assignedDate).toLocaleDateString()}</p>
                  <p>Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.description}</p>
              {item.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.attachments.map((attachment) => (
                    <span key={attachment.id} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                      {attachment.fileName}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

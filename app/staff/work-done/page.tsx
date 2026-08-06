import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import { prisma } from '@/lib/db'
import WorkDoneClient from './WorkDoneClient'

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

  const classes = Array.from(new Map(assignments.subjectAssignments.map((item) => [item.classId, { id: item.classId, name: item.className }])).values())
  const subjects = Array.from(new Map(assignments.subjectAssignments.map((item) => [item.subjectId, { id: item.subjectId, name: item.subjectName }])).values())

  return <WorkDoneClient initialEntries={workDone.map((item) => ({ id: item.id, date: item.date.toISOString(), class: item.class, subject: item.subject, topic: item.topic, description: item.description, staffId: item.staffId }))} classes={classes} subjects={subjects} currentStaffId={session.staffId} />
}

import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import { prisma } from '@/lib/db'
import HomeworkClient from './HomeworkClient'

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

  const classes = Array.from(new Map(assignments.subjectAssignments.map((item) => [item.classId, { id: item.classId, name: item.className }])).values())
  const subjects = Array.from(new Map(assignments.subjectAssignments.map((item) => [item.subjectId, { id: item.subjectId, name: item.subjectName }])).values())

  return <HomeworkClient initialHomework={homework.map((item) => ({ id: item.id, class: item.class, subject: item.subject, title: item.title, description: item.description, assignedDate: item.assignedDate.toISOString(), dueDate: item.dueDate.toISOString(), attachments: item.attachments.map((attachment) => ({ id: attachment.id, fileName: attachment.fileName, filePath: attachment.filePath })), staffId: item.staffId }))} classes={classes} subjects={subjects} currentStaffId={session.staffId} />
}

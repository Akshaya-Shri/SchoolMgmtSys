import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import { prisma } from '@/lib/db'
import MarksClient from './MarksClient'

export default async function StaffMarksPage() {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    redirect('/login')
  }

  const assignments = await getStaffAssignments(session.staffId)
  if (!assignments.isSubjectTeacher) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center max-w-xl mx-auto mt-12 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-sm text-rose-700">Subject teachers only can enter marks for their assigned subject and class combinations.</p>
      </div>
    )
  }

  const [marks, exams] = await Promise.all([
    prisma.examMark.findMany({
      where: { markedById: session.staffId },
      include: {
        student: { select: { id: true, name: true, admissionNumber: true, class: { select: { name: true } } } },
        exam: { select: { name: true } },
        subject: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.exam.findMany({ orderBy: { name: 'asc' } }),
  ])

  const classes = Array.from(new Map(assignments.subjectAssignments.map((item) => [item.classId, { id: item.classId, name: item.className }])).values())
  const subjects = Array.from(new Map(assignments.subjectAssignments.map((item) => [item.subjectId, { id: item.subjectId, name: item.subjectName }])).values())

  return <MarksClient initialMarks={marks.map((mark) => ({ id: mark.id, student: mark.student, exam: mark.exam, subject: mark.subject, maxMark: mark.maxMark, obtainedMark: mark.obtainedMark, createdAt: mark.createdAt.toISOString() }))} classes={classes} subjects={subjects} exams={exams.map((exam) => ({ id: exam.id, name: exam.name }))} />
}

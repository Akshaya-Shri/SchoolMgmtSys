import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getStaffAssignments } from '@/lib/permissions'
import { prisma } from '@/lib/db'

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

  const marks = await prisma.examMark.findMany({
    where: { markedById: session.staffId },
    include: {
      student: { select: { name: true, admissionNumber: true } },
      exam: { select: { name: true } },
      subject: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Exam Marks</h1>
        <p className="mt-2 text-sm text-slate-500">Review the marks entered for your assigned classes and subjects.</p>
      </div>

      {marks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">No marks found for your assignments.</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Exam</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Obtained</th>
                <th className="px-4 py-3 font-semibold">Maximum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marks.map((mark: { id: string; student: { name: string; admissionNumber: string }; exam: { name: string }; subject: { name: string }; obtainedMark: number; maxMark: number }) => (
                <tr key={mark.id}>
                  <td className="px-4 py-3 text-slate-700">{mark.student.name} ({mark.student.admissionNumber})</td>
                  <td className="px-4 py-3 text-slate-700">{mark.exam.name}</td>
                  <td className="px-4 py-3 text-slate-700">{mark.subject.name}</td>
                  <td className="px-4 py-3 text-slate-700">{mark.obtainedMark}</td>
                  <td className="px-4 py-3 text-slate-700">{mark.maxMark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

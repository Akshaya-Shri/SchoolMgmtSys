import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export default async function StudentMarksPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT' || !session.studentId) {
    redirect('/login')
  }

  const marks = await prisma.examMark.findMany({
    where: { studentId: session.studentId },
    include: {
      examSubject: {
        include: {
          exam: { select: { name: true } },
          subject: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Marks</h1>
        <p className="mt-2 text-sm text-slate-500">View your own examination results securely.</p>
      </div>

      {marks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">No marks available yet.</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Exam</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Maximum</th>
                <th className="px-4 py-3 font-semibold">Obtained</th>
                <th className="px-4 py-3 font-semibold">Percentage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {marks.map((mark: { id: string; examSubject: { exam: { name: string }; subject: { name: string }; maxMark: number }; obtainedMark: number }) => {
                const percentage = Math.round((mark.obtainedMark / mark.examSubject.maxMark) * 100)
                return (
                  <tr key={mark.id}>
                    <td className="px-4 py-3 text-slate-700">{mark.examSubject.exam.name}</td>
                    <td className="px-4 py-3 text-slate-700">{mark.examSubject.subject.name}</td>
                    <td className="px-4 py-3 text-slate-700">{mark.examSubject.maxMark}</td>
                    <td className="px-4 py-3 text-slate-700">{mark.obtainedMark}</td>
                    <td className="px-4 py-3 font-semibold text-indigo-700">{percentage}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

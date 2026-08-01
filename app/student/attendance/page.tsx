import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export default async function StudentAttendancePage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT' || !session.studentId) {
    redirect('/login')
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: {
      attendance: {
        orderBy: { date: 'desc' },
      },
      class: { select: { name: true } },
    },
  })

  if (!student) {
    redirect('/login')
  }

  const presenceCount = student.attendance.filter((item: { status: string }) => item.status === 'PRESENT' || item.status === 'LEAVE').length
  const attendanceRate = student.attendance.length > 0 ? Math.round((presenceCount / student.attendance.length) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Attendance</h1>
        <p className="mt-2 text-sm text-slate-500">Class: {student.class.name} • Attendance percentage: {attendanceRate}%</p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {student.attendance.map((row: { id: string; date: Date; status: string }) => (
              <tr key={row.id}>
                <td className="px-4 py-3 text-slate-500">{new Date(row.date).toLocaleDateString()}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export default async function StudentDashboardPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT' || !session.studentId) {
    redirect('/login')
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: {
      class: { select: { name: true } },
      attendance: true,
      examMarks: {
        include: { exam: { select: { name: true } }, subject: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      leaveRequests: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!student) {
    redirect('/login')
  }

  const attendanceCount = student.attendance.length
  const presentCount = student.attendance.filter((item: { status: string }) => item.status === 'PRESENT' || item.status === 'LEAVE').length
  const attendanceRate = attendanceCount > 0 ? Math.round((presentCount / attendanceCount) * 100) : 0
  const homeworkCount = await prisma.homework.count({ where: { classId: student.classId } })
  const latestExam = student.examMarks[0]

  const stats = [
    { label: 'Attendance', value: `${attendanceRate}%` },
    { label: 'Homework', value: `${homeworkCount}` },
    { label: 'Pending Leaves', value: `${student.leaveRequests.length}` },
    { label: 'Latest Result', value: latestExam ? `${latestExam.subject.name}: ${latestExam.obtainedMark}/${latestExam.maxMark}` : 'No mark' },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-7 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-100">Student Dashboard</p>
        <h1 className="mt-3 text-3xl font-extrabold">Hello, {student.name}</h1>
        <p className="mt-2 text-sm text-indigo-100">Student ID: {student.id} • Class: {student.class.name}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/student/homework" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-indigo-100">
          <h3 className="text-base font-bold text-slate-800">View Homework</h3>
          <p className="mt-2 text-sm text-slate-500">Review assigned class homework and attachments.</p>
        </Link>
        <Link href="/student/attendance" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-indigo-100">
          <h3 className="text-base font-bold text-slate-800">View Attendance</h3>
          <p className="mt-2 text-sm text-slate-500">Track present, absent, and leave statuses.</p>
        </Link>
        <Link href="/student/marks" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-indigo-100">
          <h3 className="text-base font-bold text-slate-800">View Marks</h3>
          <p className="mt-2 text-sm text-slate-500">See exam results for your assigned subject records.</p>
        </Link>
        <Link href="/student/leave-requests" className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:border-indigo-100">
          <h3 className="text-base font-bold text-slate-800">Apply Leave</h3>
          <p className="mt-2 text-sm text-slate-500">Submit a leave request and follow its status.</p>
        </Link>
      </div>
    </div>
  )
}

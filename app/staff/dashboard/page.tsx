import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { getStaffAssignments } from '@/lib/permissions'
import { 
  Users, 
  CalendarCheck, 
  FileSpreadsheet, 
  BookOpen, 
  ClipboardList, 
  UserCheck, 
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock
} from 'lucide-react'

export default async function StaffDashboardPage() {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    redirect('/login')
  }

  const staffId = session.staffId

  // Fetch staff profile with assignments
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    include: {
      classesTaught: true,
    },
  })

  if (!staff) {
    redirect('/login')
  }

  // Get structured assignments
  const assignments = await getStaffAssignments(staffId)
  const isClassTeacher = assignments.isClassTeacher
  const classTeacherClass = isClassTeacher ? assignments.classTeacherClasses[0] : null

  // Today's date boundary (midnight to midnight)
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Fetch stats based on assignments
  let todayAttendanceMarked = false
  let pendingLeavesCount = 0
  let classStudentsCount = 0

  if (isClassTeacher && classTeacherClass) {
    // 1. Check if attendance has been marked for their class today
    const attendanceCount = await prisma.attendance.count({
      where: {
        date: {
          gte: todayStart,
          lte: todayEnd,
        },
        student: {
          classId: classTeacherClass.id,
        },
      },
    })
    todayAttendanceMarked = attendanceCount > 0

    // 2. Count pending leave requests for their class
    pendingLeavesCount = await prisma.leaveRequest.count({
      where: {
        status: 'PENDING',
        student: {
          classId: classTeacherClass.id,
        },
      },
    })

    // 3. Count total students in their class
    classStudentsCount = await prisma.student.count({
      where: {
        classId: classTeacherClass.id,
      },
    })
  }

  // Fetch recent homework (limit 3)
  const recentHomework = await prisma.homework.findMany({
    where: { staffId },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })

  // Fetch recent work done (limit 3)
  const recentWorkDone = await prisma.workDone.findMany({
    where: { staffId },
    include: {
      class: { select: { name: true } },
      subject: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: 3,
  })

  // Action card definitions
  const allActions = [
    {
      title: 'Mark Attendance',
      description: 'Record daily attendance for your class.',
      href: '/staff/attendance',
      icon: CalendarCheck,
      color: 'from-emerald-500 to-teal-600',
      shadow: 'shadow-emerald-100',
      requiredRole: 'class-teacher',
    },
    {
      title: 'Upload Students',
      description: 'Bulk import students via Excel sheet.',
      href: '/staff/students/bulk-upload',
      icon: Upload,
      color: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-indigo-100',
      requiredRole: 'class-teacher',
    },
    {
      title: 'View Leave Requests',
      description: 'Review student leave applications.',
      href: '/staff/leave-requests',
      icon: UserCheck,
      color: 'from-violet-500 to-purple-600',
      shadow: 'shadow-purple-100',
      requiredRole: 'class-teacher',
    },
    {
      title: 'Enter Exam Marks',
      description: 'Record examination scores for your subjects.',
      href: '/staff/marks',
      icon: FileSpreadsheet,
      color: 'from-amber-500 to-orange-600',
      shadow: 'shadow-orange-100',
      requiredRole: 'subject-teacher',
    },
    {
      title: 'Add Work Done',
      description: 'Log topics covered in class today.',
      href: '/staff/work-done',
      icon: BookOpen,
      color: 'from-cyan-500 to-blue-600',
      shadow: 'shadow-cyan-100',
      requiredRole: 'subject-teacher',
    },
    {
      title: 'Assign Homework',
      description: 'Distribute homework and attachments.',
      href: '/staff/homework',
      icon: ClipboardList,
      color: 'from-pink-500 to-rose-600',
      shadow: 'shadow-rose-100',
      requiredRole: 'subject-teacher',
    },
  ]

  // Filter actions based on teacher role
  const actions = allActions.filter(action => {
    if (action.requiredRole === 'class-teacher') return isClassTeacher
    if (action.requiredRole === 'subject-teacher') return assignments.isSubjectTeacher
    return true
  })

  // Format date for display
  const displayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-8 text-white shadow-xl shadow-indigo-100/40 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 pointer-events-none bg-[radial-gradient(circle_at_bottom_right,_var(--tw-gradient-stops))] from-white via-indigo-100 to-transparent"></div>
        <span className="text-xs font-bold tracking-widest uppercase text-indigo-100 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
          {displayDate}
        </span>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl tracking-tight">
          Hello, {staff.name}
        </h1>
        <p className="mt-2 text-indigo-100 max-w-xl text-sm font-medium">
          {isClassTeacher && classTeacherClass
            ? `Class Teacher of Class ${classTeacherClass.name}. `
            : 'Subject Teacher. '}
          Here is your digital dashboard overview for today.
        </p>
      </div>

      {/* Class Teacher Alerts */}
      {isClassTeacher && classTeacherClass && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Attendance Status Alert */}
          <div className={`flex items-center gap-4 rounded-2xl p-5 border shadow-sm ${
            todayAttendanceMarked 
              ? 'bg-emerald-50/50 border-emerald-100/50 text-emerald-800' 
              : 'bg-amber-50/50 border-amber-100/50 text-amber-800'
          }`}>
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
              todayAttendanceMarked ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100' : 'bg-amber-500 text-white shadow-md shadow-amber-100'
            }`}>
              {todayAttendanceMarked ? <CheckCircle2 className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">Attendance ({classTeacherClass.name})</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {todayAttendanceMarked ? 'Marked for Today' : 'Pending for Today'}
              </p>
            </div>
          </div>

          {/* Pending Leaves Alert */}
          <Link href="/staff/leave-requests" className="flex items-center gap-4 rounded-2xl p-5 border bg-white border-slate-100 shadow-sm hover:border-indigo-100 transition-all duration-200">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-100`}>
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Leaves</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {pendingLeavesCount > 0 ? `${pendingLeavesCount} Requests waiting` : 'No pending requests'}
              </p>
            </div>
          </Link>

          {/* Class Students Alert */}
          <Link href="/staff/students" className="flex items-center gap-4 rounded-2xl p-5 border bg-white border-slate-100 shadow-sm hover:border-indigo-100 transition-all duration-200">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-100">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Class Students</span>
              <p className="font-bold text-slate-800 text-sm mt-0.5">
                {classStudentsCount} Registered Students
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Quick Action Grid */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.title}
                href={action.href}
                className="group relative rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-indigo-50"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr ${action.color} text-white shadow-md ${action.shadow} transition-transform duration-300 group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="mt-4 text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {action.title}
                </h4>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-500">
                  {action.description}
                </p>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Dashboard Lists */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Recent Homework Panel */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Recent Homework Allocated
            </h3>
            <Link href="/staff/homework" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-50 space-y-4">
            {recentHomework.length > 0 ? (
              recentHomework.map((hw: { id: string; title: string; class: { name: string }; subject: { name: string }; dueDate: Date; description: string }) => (
                <div key={hw.id} className="pt-4 first:pt-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{hw.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Class {hw.class.name} • {hw.subject.name}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                      Due: {new Date(hw.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                    {hw.description}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">
                No recent homework assignments found.
              </p>
            )}
          </div>
        </div>

        {/* Recent Work Done Panel */}
        <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Recent Work Done Records
            </h3>
            <Link href="/staff/work-done" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              View All
            </Link>
          </div>
          <div className="mt-4 divide-y divide-slate-50 space-y-4">
            {recentWorkDone.length > 0 ? (
              recentWorkDone.map((wd: { id: string; topic: string; class: { name: string }; subject: { name: string }; date: Date; description?: string | null }) => (
                <div key={wd.id} className="pt-4 first:pt-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{wd.topic}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Class {wd.class.name} • {wd.subject.name}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-full">
                      {new Date(wd.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {wd.description && (
                    <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {wd.description}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-4 text-center font-medium">
                No recent work done entries logged.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

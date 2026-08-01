import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { getStaffAssignments } from '@/lib/permissions'
import StudentsClient from './StudentsClient'
import { AlertCircle } from 'lucide-react'

export default async function StudentsPage() {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    redirect('/login')
  }

  const staffId = session.staffId
  const assignments = await getStaffAssignments(staffId)

  if (!assignments.isClassTeacher || assignments.classTeacherClasses.length === 0) {
    return (
      <div className="rounded-3xl border border-rose-100 bg-rose-50/50 p-8 text-center max-w-xl mx-auto mt-12 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md shadow-rose-100">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="mt-2 text-sm font-medium text-rose-700 leading-relaxed">
          You are not assigned as a Class Teacher. Only Class Teachers are authorized to manage and view the student directory.
        </p>
      </div>
    )
  }

  const classTeacherClass = assignments.classTeacherClasses[0]

  // Fetch all students in this class with their attendance, exam marks, and leaves
  const students = await prisma.student.findMany({
    where: { classId: classTeacherClass.id },
    include: {
      attendance: {
        select: { status: true },
      },
      examMarks: {
        include: {
          exam: { select: { name: true } },
          subject: { select: { name: true } },
        },
      },
      leaveRequests: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  })

  // Format student records for client
  const formattedStudents = students.map((s: {
    id: string
    admissionNumber: string
    name: string
    gender: string
    dob: Date
    parentName: string
    parentPhone: string
    attendance: { status: string }[]
    examMarks: {
      id: string
      exam: { name: string }
      subject: { name: string }
      obtainedMark: number
      maxMark: number
      isDraft: boolean
    }[]
    leaveRequests: {
      id: string
      startDate: Date
      endDate: Date
      reason: string
      status: string
      remarks: string | null
    }[]
  }) => {
    const totalDays = s.attendance.length
    const presentDays = s.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'LEAVE').length // count leave as present/exempt in percentage
    const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100

    return {
      id: s.id, // e.g. STU20260001
      admissionNumber: s.admissionNumber,
      name: s.name,
      gender: s.gender,
      dob: s.dob.toISOString().split('T')[0],
      parentName: s.parentName,
      parentPhone: s.parentPhone,
      attendancePercentage,
      attendanceRawCount: { present: presentDays, total: totalDays },
      examMarks: s.examMarks.map((em) => ({
        id: em.id,
        examName: em.exam.name,
        subjectName: em.subject.name,
        obtainedMark: em.obtainedMark,
        maxMark: em.maxMark,
        percentage: em.maxMark > 0 ? Math.round((em.obtainedMark / em.maxMark) * 100) : 0,
        isDraft: em.isDraft,
      })),
      leaveRequests: s.leaveRequests.map((lr) => ({
        id: lr.id,
        startDate: lr.startDate.toISOString().split('T')[0],
        endDate: lr.endDate.toISOString().split('T')[0],
        reason: lr.reason,
        status: lr.status as 'PENDING' | 'APPROVED' | 'REJECTED',
        remarks: lr.remarks || '',
      })),
    }
  })

  return (
    <StudentsClient 
      classTeacherClass={classTeacherClass} 
      initialStudents={formattedStudents} 
    />
  )
}

import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { verifyClassTeacher } from '@/lib/permissions'

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function parseAcademicYear(value?: string | null) {
  if (!value) return null
  const match = value.match(/^(\d{4})\s*-\s*(\d{4})$/)
  if (!match) return null
  const startYear = Number(match[1])
  const endYear = Number(match[2])
  return {
    startDate: new Date(`${startYear}-07-01T00:00:00.000Z`),
    endDate: new Date(`${endYear}-06-30T23:59:59.999Z`),
  }
}

function parseMonthFilter(value?: string | null) {
  if (!value) return null
  const match = value.match(/^(\d{4})-(\d{1,2})$/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (month < 1 || month > 12) return null
  return {
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    endDate: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  }
}

async function buildAttendanceRows(filters: {
  staffId: string
  classId?: string
  section?: string
  dateFrom?: string
  dateTo?: string
  month?: string
  academicYear?: string
}) {
  const classWhere = filters.classId ? { id: filters.classId } : undefined
  const sectionFilter = filters.section ? { section: filters.section } : undefined
  const allowedClasses = await prisma.class.findMany({
    where: { AND: [classWhere ? { id: filters.classId } : {}, sectionFilter ? { section: filters.section } : {}] },
    select: { id: true, name: true, grade: true, section: true },
  })

  const classIds = allowedClasses.map((item) => item.id)
  if (classIds.length === 0) {
    return { rows: [], classes: [] as { id: string; name: string; grade: string; section: string }[] }
  }

  const dateFilter: { gte?: Date; lte?: Date } = {}
  if (filters.dateFrom) dateFilter.gte = new Date(`${filters.dateFrom}T00:00:00.000Z`)
  if (filters.dateTo) dateFilter.lte = new Date(`${filters.dateTo}T23:59:59.999Z`)

  const monthFilter = parseMonthFilter(filters.month)
  if (monthFilter) {
    dateFilter.gte = monthFilter.startDate
    dateFilter.lte = monthFilter.endDate
  }

  const academicYearFilter = parseAcademicYear(filters.academicYear)
  if (academicYearFilter) {
    dateFilter.gte = academicYearFilter.startDate
    dateFilter.lte = academicYearFilter.endDate
  }

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      student: { classId: { in: classIds } },
      ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          admissionNumber: true,
          name: true,
          class: { select: { id: true, name: true, grade: true, section: true } },
        },
      },
    },
    orderBy: [{ student: { name: 'asc' } }, { date: 'asc' }],
  })

  const rowsByStudent = new Map<string, {
    studentId: string
    admissionNumber: string
    studentName: string
    className: string
    totalWorkingDays: number
    present: number
    absent: number
    leave: number
    attendancePercentage: string
  }>()

  for (const record of attendanceRecords) {
    const key = record.student.id
    const existing = rowsByStudent.get(key)
    if (!existing) {
      rowsByStudent.set(key, {
        studentId: record.student.id,
        admissionNumber: record.student.admissionNumber,
        studentName: record.student.name,
        className: record.student.class.name,
        totalWorkingDays: 0,
        present: 0,
        absent: 0,
        leave: 0,
        attendancePercentage: '0%',
      })
    }
    const row = rowsByStudent.get(key)!
    row.totalWorkingDays += 1
    if (record.status === 'PRESENT') row.present += 1
    else if (record.status === 'ABSENT') row.absent += 1
    else if (record.status === 'LEAVE') row.leave += 1
  }

  const rows = Array.from(rowsByStudent.values()).map((row) => {
    const attendancePercentage = row.totalWorkingDays > 0
      ? `${Math.round(((row.present + row.leave) / row.totalWorkingDays) * 100)}%`
      : '0%'
    return {
      ...row,
      attendancePercentage,
    }
  })

  return { rows, classes: allowedClasses }
}

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') === 'xlsx' ? 'xlsx' : 'pdf'
  const classId = searchParams.get('classId') || undefined
  const section = searchParams.get('section') || undefined
  const dateFrom = searchParams.get('dateFrom') || undefined
  const dateTo = searchParams.get('dateTo') || undefined
  const month = searchParams.get('month') || undefined
  const academicYear = searchParams.get('academicYear') || undefined

  if (classId) {
    const isTeacher = await verifyClassTeacher(session.staffId, classId)
    if (!isTeacher) {
      return NextResponse.json({ error: 'You are not assigned to this class.' }, { status: 403 })
    }
  } else {
    const assignments = await prisma.class.findMany({
      where: { classTeacherId: session.staffId },
      select: { id: true },
    })
    if (assignments.length === 0) {
      return NextResponse.json({ error: 'You are not assigned as a class teacher.' }, { status: 403 })
    }
  }

  const { rows, classes } = await buildAttendanceRows({
    staffId: session.staffId,
    classId,
    section,
    dateFrom,
    dateTo,
    month,
    academicYear,
  })

  const className = classId
    ? classes[0]?.name || 'Class'
    : 'AllClasses'
  const monthName = month ? new Date(`${month}-01T00:00:00.000Z`).toLocaleString('en-US', { month: 'long', year: 'numeric' }) : (academicYear || 'Report')
  const fileName = `Attendance_Report_${className.replace(/\s+/g, '_')}_${toTitleCase(monthName).replace(/\s+/g, '_')}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
      'Student ID': row.studentId,
      'Admission Number': row.admissionNumber,
      'Student Name': row.studentName,
      'Class': row.className,
      'Total Working Days': row.totalWorkingDays,
      Present: row.present,
      Absent: row.absent,
      Leave: row.leave,
      'Attendance Percentage': row.attendancePercentage,
    })))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report')
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
    return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  }

  const doc = new PDFDocument({ margin: 32 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)))

  doc.fontSize(18).text('Attendance Report', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(10).text(`Class: ${className}`)
  doc.text(`Generated: ${new Date().toLocaleString()}`)
  doc.moveDown(1)

  doc.fontSize(10)
  doc.text('Student ID | Admission Number | Student Name | Class | Total Working Days | Present | Absent | Leave | Attendance Percentage')
  doc.moveDown(0.4)
  rows.forEach((row) => {
    doc.text(`${row.studentId} | ${row.admissionNumber} | ${row.studentName} | ${row.className} | ${row.totalWorkingDays} | ${row.present} | ${row.absent} | ${row.leave} | ${row.attendancePercentage}`)
  })

  doc.end()
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  })
}

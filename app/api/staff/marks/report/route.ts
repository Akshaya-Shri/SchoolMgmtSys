import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import * as XLSX from 'xlsx'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { verifySubjectTeacher } from '@/lib/permissions'

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

export async function GET(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') === 'xlsx' ? 'xlsx' : 'pdf'
  const classId = searchParams.get('classId') || undefined
  const section = searchParams.get('section') || undefined
  const subjectId = searchParams.get('subjectId') || undefined
  const examId = searchParams.get('examId') || undefined
  const academicYear = searchParams.get('academicYear') || undefined

  if (classId && subjectId) {
    const isTeacher = await verifySubjectTeacher(session.staffId, classId, subjectId)
    if (!isTeacher) {
      return NextResponse.json({ error: 'You are not assigned to this subject/class.' }, { status: 403 })
    }
  }

  const academicYearFilter = parseAcademicYear(academicYear)
  const where: Record<string, unknown> = {}
  if (classId || section) {
    where.student = {}
    if (classId) (where.student as Record<string, unknown>).classId = classId
    if (section) (where.student as Record<string, unknown>).class = { section }
  }
  if (subjectId || examId) {
    where.examSubject = {}
    if (subjectId) (where.examSubject as Record<string, unknown>).subjectId = subjectId
    if (examId) (where.examSubject as Record<string, unknown>).examId = examId
  }
  if (academicYearFilter) {
    where.createdAt = { gte: academicYearFilter.startDate, lte: academicYearFilter.endDate }
  }

  const marks = await prisma.examMark.findMany({
    where: Object.keys(where).length > 0 ? where : {},
    include: {
      student: { select: { id: true, name: true, admissionNumber: true, class: { select: { name: true, section: true } } } },
      examSubject: {
        include: {
          subject: { select: { name: true } },
          exam: { select: { name: true } },
        },
      },
    },
    orderBy: [{ student: { name: 'asc' } }, { createdAt: 'asc' }],
  })

  const rows = marks.map((mark) => {
    const maxMark = mark.examSubject.maxMark
    const percentage = maxMark > 0 ? `${Math.round((mark.obtainedMark / maxMark) * 100)}%` : '0%'
    return {
      studentId: mark.student.id,
      studentName: mark.student.name,
      subject: mark.examSubject.subject.name,
      exam: mark.examSubject.exam.name,
      maxMark,
      obtainedMark: mark.obtainedMark,
      percentage,
    }
  })

  const className = classId ? marks[0]?.student.class.name || 'Class' : 'AllClasses'
  const fileName = `Exam_Report_${className.replace(/\s+/g, '_')}_${subjectId ? 'Subject' : 'AllSubjects'}.${format === 'xlsx' ? 'xlsx' : 'pdf'}`

  if (format === 'xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(rows.map((row) => ({
      'Student ID': row.studentId,
      'Student Name': row.studentName,
      Subject: row.subject,
      Exam: row.exam,
      'Maximum Marks': row.maxMark,
      'Obtained Marks': row.obtainedMark,
      Percentage: row.percentage,
    })))
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks Report')
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

  doc.fontSize(18).text('Marks Report', { align: 'center' })
  doc.moveDown(0.5)
  doc.fontSize(10).text(`Class: ${className}`)
  doc.text(`Generated: ${new Date().toLocaleString()}`)
  doc.moveDown(1)

  doc.fontSize(10)
  doc.text('Student ID | Student Name | Subject | Exam | Maximum Marks | Obtained Marks | Percentage')
  doc.moveDown(0.4)
  rows.forEach((row) => {
    doc.text(`${row.studentId} | ${row.studentName} | ${row.subject} | ${row.exam} | ${row.maxMark} | ${row.obtainedMark} | ${row.percentage}`)
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

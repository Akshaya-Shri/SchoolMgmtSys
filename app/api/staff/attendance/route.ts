import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { verifyClassTeacher } from '@/lib/permissions'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json()
  const { classId, date, records } = body as {
    classId: string
    date: string
    records: { studentId: string; status: 'PRESENT' | 'ABSENT' | 'LEAVE' }[]
  }

  if (!classId || !date || !records?.length) {
    return NextResponse.json({ error: 'Invalid attendance payload.' }, { status: 400 })
  }

  const isTeacher = await verifyClassTeacher(session.staffId, classId)
  if (!isTeacher) {
    return NextResponse.json({ error: 'You are not assigned to this class.' }, { status: 403 })
  }

  try {
    const normalizedDate = new Date(`${date}T00:00:00.000Z`)
    const saved: { studentId: string }[] = []

    for (const record of records) {
      const existing = await prisma.attendance.findUnique({
        where: {
          studentId_date: {
            studentId: record.studentId,
            date: normalizedDate,
          },
        },
      })

      if (existing) {
        await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            status: record.status,
            markedById: session.staffId,
          },
        })
      } else {
        await prisma.attendance.create({
          data: {
            studentId: record.studentId,
            date: normalizedDate,
            status: record.status,
            markedById: session.staffId,
          },
        })
      }

      saved.push({ studentId: record.studentId })
    }

    return NextResponse.json({ success: true, summary: { saved: saved.length } })
  } catch (error) {
    console.error('Attendance save error:', error)
    return NextResponse.json({ error: 'Unable to save attendance.' }, { status: 500 })
  }
}

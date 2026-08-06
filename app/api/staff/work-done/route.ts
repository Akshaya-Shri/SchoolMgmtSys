import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { verifySubjectTeacher } from '@/lib/permissions'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await request.json()
  const { classId, subjectId, date, topic, description } = body as {
    classId: string
    subjectId: string
    date: string
    topic: string
    description?: string
  }

  if (!classId || !subjectId || !date || !topic) {
    return NextResponse.json({ error: 'Invalid work-done payload.' }, { status: 400 })
  }

  const isTeacher = await verifySubjectTeacher(session.staffId, classId, subjectId)
  if (!isTeacher) {
    return NextResponse.json({ error: 'You are not assigned to this subject/class.' }, { status: 403 })
  }

  const entry = await prisma.workDone.create({
    data: {
      classId,
      subjectId,
      staffId: session.staffId,
      date: new Date(date),
      topic,
      description: description || null,
    },
  })

  return NextResponse.json({ success: true, data: entry })
}

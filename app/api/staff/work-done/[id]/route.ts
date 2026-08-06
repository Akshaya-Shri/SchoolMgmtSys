import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { verifySubjectTeacher } from '@/lib/permissions'

async function canManageEntry(sessionStaffId: string, entry: { classId: string; subjectId: string; staffId: string }) {
  if (entry.staffId === sessionStaffId) return true
  return verifySubjectTeacher(sessionStaffId, entry.classId, entry.subjectId)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { classId, subjectId, date, topic, description } = body as {
    classId: string
    subjectId: string
    date: string
    topic: string
    description?: string
  }

  const entry = await prisma.workDone.findUnique({ where: { id }, select: { classId: true, subjectId: true, staffId: true } })
  if (!entry) return NextResponse.json({ error: 'Work done record not found.' }, { status: 404 })

  const allowed = await canManageEntry(session.staffId, entry)
  if (!allowed) return NextResponse.json({ error: 'You cannot edit this entry.' }, { status: 403 })

  const updated = await prisma.workDone.update({
    where: { id },
    data: {
      classId,
      subjectId,
      date: new Date(date),
      topic,
      description: description || null,
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const entry = await prisma.workDone.findUnique({ where: { id }, select: { classId: true, subjectId: true, staffId: true } })
  if (!entry) return NextResponse.json({ error: 'Work done record not found.' }, { status: 404 })

  const allowed = await canManageEntry(session.staffId, entry)
  if (!allowed) return NextResponse.json({ error: 'You cannot delete this entry.' }, { status: 403 })

  await prisma.workDone.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

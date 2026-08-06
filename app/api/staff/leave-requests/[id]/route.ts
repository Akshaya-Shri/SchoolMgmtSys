import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { verifyClassTeacherForStudent } from '@/lib/permissions'

function mapStatus(value: string) {
  if (value === 'APPROVED' || value === 'REJECTED' || value === 'PENDING') return value
  return 'PENDING'
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()
  const { status, remarks } = body as { status: string; remarks?: string }

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id },
    include: { student: true },
  })
  if (!leaveRequest) return NextResponse.json({ error: 'Leave request not found.' }, { status: 404 })

  const isTeacher = await verifyClassTeacherForStudent(session.staffId, leaveRequest.studentId)
  if (!isTeacher) return NextResponse.json({ error: 'You are not assigned to this class.' }, { status: 403 })

  const normalizedStatus = mapStatus(status)
  const updated = await prisma.leaveRequest.update({
    where: { id },
    data: {
      status: normalizedStatus,
      remarks: remarks || null,
      reviewedById: session.staffId,
      updatedAt: new Date(),
    },
  })

  return NextResponse.json({ success: true, data: updated })
}

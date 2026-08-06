import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'
import { verifySubjectTeacher } from '@/lib/permissions'

const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'homework')

async function saveAttachment(file: File) {
  await fs.mkdir(uploadDir, { recursive: true })
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
  const ext = path.extname(file.name).toLowerCase()
  if (!allowedExtensions.includes(ext) || !allowedTypes.includes(file.type)) {
    throw new Error('Unsupported file type.')
  }
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
  const filePath = path.join(uploadDir, safeName)
  const bytes = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, bytes)
  return {
    fileName: file.name,
    filePath: `/uploads/homework/${safeName}`,
    fileType: file.type,
    fileSize: file.size,
  }
}

async function removeAttachment(filePath: string) {
  const absolutePath = path.join(process.cwd(), 'public', filePath.replace(/^\//, ''))
  await fs.rm(absolutePath, { force: true })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { id } = await params
  const formData = await request.formData()
  const classId = formData.get('classId')?.toString()
  const subjectId = formData.get('subjectId')?.toString()
  const title = formData.get('title')?.toString()
  const description = formData.get('description')?.toString() || ''
  const assignedDate = formData.get('assignedDate')?.toString()
  const dueDate = formData.get('dueDate')?.toString()
  const file = formData.get('attachment') as File | null

  const existing = await prisma.homework.findUnique({
    where: { id },
    include: { attachments: true },
  })
  if (!existing) return NextResponse.json({ error: 'Homework not found.' }, { status: 404 })

  const isTeacher = await verifySubjectTeacher(session.staffId, existing.classId, existing.subjectId)
  if (!isTeacher) return NextResponse.json({ error: 'You are not assigned to this subject/class.' }, { status: 403 })

  let attachmentData: { fileName: string; filePath: string; fileType: string; fileSize: number } | undefined
  if (file && file.size > 0) {
    attachmentData = await saveAttachment(file)
    await Promise.all(existing.attachments.map((attachment) => removeAttachment(attachment.filePath)))
    await prisma.homeworkAttachment.deleteMany({ where: { homeworkId: id } })
  }

  const updated = await prisma.homework.update({
    where: { id },
    data: {
      classId: classId || existing.classId,
      subjectId: subjectId || existing.subjectId,
      title: title || existing.title,
      description,
      assignedDate: assignedDate ? new Date(assignedDate) : existing.assignedDate,
      dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
      ...(attachmentData ? { attachments: { create: attachmentData } } : {}),
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
  const existing = await prisma.homework.findUnique({
    where: { id },
    include: { attachments: true },
  })
  if (!existing) return NextResponse.json({ error: 'Homework not found.' }, { status: 404 })

  const isTeacher = await verifySubjectTeacher(session.staffId, existing.classId, existing.subjectId)
  if (!isTeacher) return NextResponse.json({ error: 'You are not assigned to this subject/class.' }, { status: 403 })

  await Promise.all(existing.attachments.map((attachment) => removeAttachment(attachment.filePath)))
  await prisma.homework.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

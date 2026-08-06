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

export async function POST(request: Request) {
  const session = await getSession()
  if (!session || session.role !== 'STAFF' || !session.staffId) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const formData = await request.formData()
  const classId = formData.get('classId')?.toString()
  const subjectId = formData.get('subjectId')?.toString()
  const title = formData.get('title')?.toString()
  const description = formData.get('description')?.toString() || ''
  const assignedDate = formData.get('assignedDate')?.toString()
  const dueDate = formData.get('dueDate')?.toString()
  const file = formData.get('attachment') as File | null

  if (!classId || !subjectId || !title || !assignedDate || !dueDate) {
    return NextResponse.json({ error: 'Invalid homework payload.' }, { status: 400 })
  }

  const isTeacher = await verifySubjectTeacher(session.staffId, classId, subjectId)
  if (!isTeacher) {
    return NextResponse.json({ error: 'You are not assigned to this subject/class.' }, { status: 403 })
  }

  let attachmentData: { fileName: string; filePath: string; fileType: string; fileSize: number } | undefined
  if (file && file.size > 0) {
    attachmentData = await saveAttachment(file)
  }

  const homework = await prisma.homework.create({
    data: {
      classId,
      subjectId,
      staffId: session.staffId,
      title,
      description,
      assignedDate: new Date(assignedDate),
      dueDate: new Date(dueDate),
      attachments: attachmentData ? { create: attachmentData } : undefined,
    },
  })

  return NextResponse.json({ success: true, data: homework })
}

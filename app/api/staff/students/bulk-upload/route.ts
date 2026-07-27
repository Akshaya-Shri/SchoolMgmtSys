import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@/lib/auth/session'
import { verifyClassTeacher } from '@/lib/permissions'
import bcrypt from 'bcryptjs'

interface StudentImportRow {
  admissionNumber: string
  name: string
  dob: string // YYYY-MM-DD
  gender: string
  parentName: string
  parentPhone: string
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'STAFF' || !session.staffId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }

    const body = await request.json()
    const { students, classId } = body as { students: StudentImportRow[]; classId: string }

    if (!students || !Array.isArray(students) || !classId) {
      return NextResponse.json({ error: 'Invalid payload.' }, { status: 400 })
    }

    // 1. Verify that this staff member is the class teacher for classId
    const isTeacher = await verifyClassTeacher(session.staffId, classId)
    if (!isTeacher) {
      return NextResponse.json(
        { error: 'Access denied. You can only import students to your assigned class.' },
        { status: 403 }
      )
    }

    const classRecord = await prisma.class.findUnique({
      where: { id: classId },
      select: { name: true },
    })

    if (!classRecord) {
      return NextResponse.json({ error: 'Class not found.' }, { status: 404 })
    }

    const currentYear = new Date().getFullYear().toString()
    
    // We will process each student. To avoid partial saves or database conflicts, we'll process them in a loop
    // and track successes, duplicates, and failures.
    const importedList: {
      admissionNumber: string
      name: string
      studentId: string
      tempPassword: string
      status: 'success' | 'duplicate' | 'error'
      errorDetails?: string
    }[] = []

    // Cache existing admission numbers to prevent querying DB repeatedly
    const existingAdmissions = new Set(
      (await prisma.student.findMany({
        select: { admissionNumber: true },
      })).map(s => s.admissionNumber)
    )

    // Cache existing student usernames
    const existingUsernames = new Set(
      (await prisma.user.findMany({
        where: { role: 'STUDENT' },
        select: { username: true },
      })).map(u => u.username)
    )

    // Count students to generate IDs
    let baseCount = await prisma.student.count()

    for (const student of students) {
      const { admissionNumber, name, dob, gender, parentName, parentPhone } = student

      // Check DB duplication
      if (existingAdmissions.has(admissionNumber)) {
        importedList.push({
          admissionNumber,
          name,
          studentId: '',
          tempPassword: '',
          status: 'duplicate',
          errorDetails: `Admission number ${admissionNumber} already exists in database.`,
        })
        continue
      }

      try {
        // Generate a unique Student ID (e.g. STU20260001)
        let studentId = ''
        let isUnique = false
        let retries = 0
        
        while (!isUnique && retries < 10) {
          baseCount++
          const seq = baseCount.toString().padStart(4, '0')
          studentId = `STU${currentYear}${seq}`
          
          if (!existingUsernames.has(studentId)) {
            isUnique = true
            existingUsernames.add(studentId)
          }
          retries++
        }

        // Generate temporary password based on DOB: STU#DDMMYYYY
        const parsedDate = new Date(dob)
        const day = parsedDate.getDate().toString().padStart(2, '0')
        const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0')
        const year = parsedDate.getFullYear().toString()
        const tempPassword = `STU#${day}${month}${year}`

        // Hash temporary password
        const hashedPassword = await bcrypt.hash(tempPassword, 10)

        // DB Transaction: Create User, then Student
        await prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: {
              username: studentId,
              password: hashedPassword,
              role: 'STUDENT',
            },
          })

          await tx.student.create({
            data: {
              id: studentId, // Set primary key ID as studentId
              userId: user.id,
              admissionNumber,
              name,
              dob: parsedDate,
              gender,
              parentName,
              parentPhone,
              classId,
            },
          })
        })

        // Add to cache
        existingAdmissions.add(admissionNumber)

        importedList.push({
          admissionNumber,
          name,
          studentId,
          tempPassword,
          status: 'success',
        })
      } catch (err: any) {
        console.error('Error importing student row:', err)
        importedList.push({
          admissionNumber,
          name,
          studentId: '',
          tempPassword: '',
          status: 'error',
          errorDetails: err.message || 'Database error during insertion.',
        })
      }
    }

    const successCount = importedList.filter(item => item.status === 'success').length
    const duplicateCount = importedList.filter(item => item.status === 'duplicate').length
    const failedCount = importedList.filter(item => item.status === 'error').length

    return NextResponse.json({
      success: true,
      importedList,
      summary: {
        total: students.length,
        success: successCount,
        duplicate: duplicateCount,
        failed: failedCount,
      },
    })
  } catch (error) {
    console.error('Bulk upload route error:', error)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

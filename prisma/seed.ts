import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.js'
import bcrypt from 'bcryptjs'

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  console.log('Seeding database...')

  // Clear existing data
  await prisma.leaveRequest.deleteMany({})
  await prisma.homeworkAttachment.deleteMany({})
  await prisma.homework.deleteMany({})
  await prisma.workDone.deleteMany({})
  await prisma.examMark.deleteMany({})
  await prisma.exam.deleteMany({})
  await prisma.attendance.deleteMany({})
  await prisma.student.deleteMany({})
  await prisma.staffSubjectAssignment.deleteMany({})
  await prisma.class.deleteMany({})
  await prisma.subject.deleteMany({})
  await prisma.staff.deleteMany({})
  await prisma.user.deleteMany({})

  console.log('Cleared database.')

  // Hash password
  const hashedPassword = bcrypt.hashSync('password123', 10)

  // 1. Create Staff User & Profile (Priya)
  const priyaUser = await prisma.user.create({
    data: {
      username: 'priya',
      password: hashedPassword,
      role: 'STAFF',
    },
  })

  const priyaStaff = await prisma.staff.create({
    data: {
      userId: priyaUser.id,
      name: 'Priya Sharma',
      email: 'priya@school.edu',
      phone: '9876543210',
    },
  })

  // Create another subject teacher (Amit - Maths teacher)
  const amitUser = await prisma.user.create({
    data: {
      username: 'amit',
      password: hashedPassword,
      role: 'STAFF',
    },
  })

  const amitStaff = await prisma.staff.create({
    data: {
      userId: amitUser.id,
      name: 'Amit Verma',
      email: 'amit@school.edu',
      phone: '9876543219',
    },
  })

  // 2. Create Subjects
  const science = await prisma.subject.create({ data: { name: 'Science' } })
  const maths = await prisma.subject.create({ data: { name: 'Mathematics' } })
  const english = await prisma.subject.create({ data: { name: 'English' } })
  const social = await prisma.subject.create({ data: { name: 'Social Studies' } })

  // 3. Create Classes
  const c6A = await prisma.class.create({ data: { grade: '6', section: 'A', name: '6-A' } })
  const c7A = await prisma.class.create({ data: { grade: '7', section: 'A', name: '7-A' } })
  const c8A = await prisma.class.create({ data: { grade: '8', section: 'A', name: '8-A', classTeacherId: priyaStaff.id } })
  const c9A = await prisma.class.create({ data: { grade: '9', section: 'A', name: '9-A' } })
  const c10A = await prisma.class.create({ data: { grade: '10', section: 'A', name: '10-A', classTeacherId: amitStaff.id } })

  console.log('Created subjects and classes.')

  // 4. Create Staff Subject Assignments
  // Priya teaches Science in 6-A, 7-A, 8-A
  await prisma.staffSubjectAssignment.createMany({
    data: [
      { staffId: priyaStaff.id, classId: c6A.id, subjectId: science.id },
      { staffId: priyaStaff.id, classId: c7A.id, subjectId: science.id },
      { staffId: priyaStaff.id, classId: c8A.id, subjectId: science.id },
    ],
  })

  // Amit teaches Mathematics in 8-A and 10-A
  await prisma.staffSubjectAssignment.createMany({
    data: [
      { staffId: amitStaff.id, classId: c8A.id, subjectId: maths.id },
      { staffId: amitStaff.id, classId: c10A.id, subjectId: maths.id },
    ],
  })

  console.log('Created subject assignments.')

  // 5. Create Student Users & Profiles
  // Student 1 (Rahul)
  const rahulUser = await prisma.user.create({
    data: {
      username: 'STU20260001',
      password: hashedPassword,
      role: 'STUDENT',
    },
  })

  const rahulStudent = await prisma.student.create({
    data: {
      userId: rahulUser.id,
      admissionNumber: 'ADM20260001',
      name: 'Rahul Kumar',
      dob: new Date('2012-05-15T00:00:00Z'),
      gender: 'Male',
      parentName: 'Sanjay Kumar',
      parentPhone: '9876543211',
      classId: c8A.id,
    },
  })

  // Student 2 (Anya)
  const anyaUser = await prisma.user.create({
    data: {
      username: 'STU20260002',
      password: hashedPassword,
      role: 'STUDENT',
    },
  })

  const anyaStudent = await prisma.student.create({
    data: {
      userId: anyaUser.id,
      admissionNumber: 'ADM20260002',
      name: 'Anya Sen',
      dob: new Date('2012-09-22T00:00:00Z'),
      gender: 'Female',
      parentName: 'Rohan Sen',
      parentPhone: '9876543212',
      classId: c8A.id,
    },
  })

  console.log('Created sample students.')

  // 6. Create Exams
  const exams = []
  for (let i = 1; i <= 6; i++) {
    const exam = await prisma.exam.create({
      data: { name: `Exam ${i}` },
    })
    exams.push(exam)
  }

  console.log('Created 6 standard exams.')

  // 7. Create Sample Attendance for Rahul and Anya
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  await prisma.attendance.createMany({
    data: [
      { studentId: rahulStudent.id, date: yesterday, status: 'PRESENT', markedById: priyaStaff.id },
      { studentId: anyaStudent.id, date: yesterday, status: 'PRESENT', markedById: priyaStaff.id },
      { studentId: rahulStudent.id, date: today, status: 'PRESENT', markedById: priyaStaff.id },
      { studentId: anyaStudent.id, date: today, status: 'ABSENT', markedById: priyaStaff.id },
    ],
  })

  console.log('Created sample attendance records.')

  // 8. Create Sample Homework (Science by Priya for 8-A)
  const scienceHomework = await prisma.homework.create({
    data: {
      classId: c8A.id,
      subjectId: science.id,
      staffId: priyaStaff.id,
      title: 'Photosynthesis Diagram',
      description: 'Draw a neat labeled diagram of the light-dependent reactions of photosynthesis in your class register.',
      assignedDate: yesterday,
      dueDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // Due in 2 days
    },
  })

  // Create another homework (Maths by Amit for 8-A)
  await prisma.homework.create({
    data: {
      classId: c8A.id,
      subjectId: maths.id,
      staffId: amitStaff.id,
      title: 'Quadratic Equations Practice',
      description: 'Solve problems 1 to 10 from Chapter 4 of the textbook.',
      assignedDate: today,
      dueDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // Due in 3 days
    },
  })

  console.log('Created sample homework.')

  // 9. Create Sample Work Done entries (Science by Priya for 8-A)
  await prisma.workDone.create({
    data: {
      date: yesterday,
      classId: c8A.id,
      subjectId: science.id,
      staffId: priyaStaff.id,
      topic: 'Introduction to Photosynthesis',
      description: 'Discussed the chemical formula and the role of chlorophyll.',
    },
  })

  await prisma.workDone.create({
    data: {
      date: today,
      classId: c8A.id,
      subjectId: science.id,
      staffId: priyaStaff.id,
      topic: 'Light Dependent Reactions',
      description: 'Covered Photosystem I and II and electron transport chain.',
    },
  })

  console.log('Created sample work done records.')

  // 10. Create Sample Exam Marks (Exam 1)
  await prisma.examMark.createMany({
    data: [
      {
        studentId: rahulStudent.id,
        examId: exams[0].id,
        subjectId: science.id,
        maxMark: 100,
        obtainedMark: 85,
        markedById: priyaStaff.id,
        isDraft: false,
      },
      {
        studentId: anyaStudent.id,
        examId: exams[0].id,
        subjectId: science.id,
        maxMark: 100,
        obtainedMark: 92,
        markedById: priyaStaff.id,
        isDraft: false,
      },
      {
        studentId: rahulStudent.id,
        examId: exams[0].id,
        subjectId: maths.id,
        maxMark: 100,
        obtainedMark: 78,
        markedById: amitStaff.id,
        isDraft: false,
      },
    ],
  })

  console.log('Created sample exam marks.')

  // 11. Create Sample Leave Request (Rahul)
  await prisma.leaveRequest.create({
    data: {
      studentId: rahulStudent.id,
      startDate: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), // Starts in 5 days
      endDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      reason: 'Attending elder sister\'s wedding in home town.',
      status: 'PENDING',
    },
  })

  console.log('Created sample leave request.')
  console.log('Seeding finished successfully!')

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error('Error seeding database:', e)
  process.exit(1)
})

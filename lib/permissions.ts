import { prisma } from '@/lib/db'

export interface StaffAssignments {
  isClassTeacher: boolean
  isSubjectTeacher: boolean
  classTeacherClasses: { id: string; name: string; grade: string; section: string }[]
  subjectAssignments: {
    id: string
    classId: string
    className: string
    subjectId: string
    subjectName: string
  }[]
}

/**
 * Get all assignments for a staff member.
 */
export async function getStaffAssignments(staffId: string): Promise<StaffAssignments> {
  const [classTeacherClasses, subjectAssignments] = await Promise.all([
    prisma.class.findMany({
      where: { classTeacherId: staffId },
      select: { id: true, name: true, grade: true, section: true },
    }),
    prisma.staffSubjectAssignment.findMany({
      where: { staffId },
      include: {
        class: { select: { name: true } },
        subject: { select: { name: true } },
      },
    }),
  ])

  return {
    isClassTeacher: classTeacherClasses.length > 0,
    isSubjectTeacher: subjectAssignments.length > 0,
    classTeacherClasses,
    subjectAssignments: subjectAssignments.map((sa) => ({
      id: sa.id,
      classId: sa.classId,
      className: sa.class.name,
      subjectId: sa.subjectId,
      subjectName: sa.subject.name,
    })),
  }
}

/**
 * Verify if the staff member is the class teacher of a specific class.
 */
export async function verifyClassTeacher(staffId: string, classId: string): Promise<boolean> {
  const count = await prisma.class.count({
    where: {
      id: classId,
      classTeacherId: staffId,
    },
  })
  return count > 0
}

/**
 * Verify if the staff member is assigned to teach a specific subject in a specific class.
 */
export async function verifySubjectTeacher(
  staffId: string,
  classId: string,
  subjectId: string
): Promise<boolean> {
  const count = await prisma.staffSubjectAssignment.count({
    where: {
      staffId,
      classId,
      subjectId,
    },
  })
  return count > 0
}

/**
 * Check if the staff member is a class teacher of the class the student belongs to.
 * Useful for reviewing leave requests or viewing student profiles.
 */
export async function verifyClassTeacherForStudent(
  staffId: string,
  studentId: string
): Promise<boolean> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { classId: true },
  })
  if (!student) return false
  return verifyClassTeacher(staffId, student.classId)
}

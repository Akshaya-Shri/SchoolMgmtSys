import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db'

export default async function StudentHomeworkPage() {
  const session = await getSession()
  if (!session || session.role !== 'STUDENT' || !session.studentId) {
    redirect('/login')
  }

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    select: { classId: true },
  })

  if (!student) {
    redirect('/login')
  }

  const homework = await prisma.homework.findMany({
    where: { classId: student.classId },
    include: {
      subject: { select: { name: true } },
      staff: { select: { name: true } },
      attachments: true,
    },
    orderBy: { dueDate: 'asc' },
  })

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-slate-900">Homework</h1>
        <p className="mt-2 text-sm text-slate-500">Review your class homework, due dates, and attachments.</p>
      </div>

      {homework.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">No homework found for your class.</div>
      ) : (
        <div className="space-y-4">
          {homework.map((item: { id: string; subject: { name: string }; title: string; staff: { name: string }; assignedDate: Date; dueDate: Date; description: string; attachments: { id: string; filePath: string; fileName: string }[] }) => (
            <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{item.subject.name}</p>
                  <h3 className="mt-1 text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">Teacher: {item.staff.name}</p>
                </div>
                <div className="text-sm text-slate-600">
                  <p>Assigned: {new Date(item.assignedDate).toLocaleDateString()}</p>
                  <p>Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">{item.description}</p>
              {item.attachments.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {item.attachments.map((attachment) => (
                    <a key={attachment.id} href={attachment.filePath} className="rounded-xl bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                      {attachment.fileName}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

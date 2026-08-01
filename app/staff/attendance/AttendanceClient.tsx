'use client'

import { useMemo, useState } from 'react'
import { CheckCheck, Circle, CalendarClock, Save } from 'lucide-react'

interface StudentRow {
  id: string
  name: string
  admissionNumber: string
  class: { name: string }
}

interface AttendanceClientProps {
  classTeacherClass: { id: string; name: string; grade: string; section: string }
  students: StudentRow[]
}

const statusOptions = [
  { label: 'Present', value: 'PRESENT' },
  { label: 'Absent', value: 'ABSENT' },
  { label: 'Leave', value: 'LEAVE' },
] as const

export default function AttendanceClient({ classTeacherClass, students }: AttendanceClientProps) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState<Record<string, string>>(
    Object.fromEntries(students.map((student) => [student.id, 'PRESENT']))
  )
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const totalStudents = useMemo(() => students.length, [students])

  const updateStatus = (studentId: string, status: string) => {
    setRecords((current) => ({ ...current, [studentId]: status }))
  }

  const markAll = (status: string) => {
    setRecords(Object.fromEntries(students.map((student) => [student.id, status])))
  }

  const submitAttendance = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/staff/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: classTeacherClass.id,
          date,
          records: students.map((student) => ({
            studentId: student.id,
            status: records[student.id] ?? 'PRESENT',
          })),
        }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Unable to save attendance.')
      }

      setMessage(`Attendance saved for ${result.summary.saved} student(s).`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save attendance.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">Attendance</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Mark Attendance for {classTeacherClass.name}</h1>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            <CalendarClock className="h-4 w-4 text-indigo-600" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => markAll('PRESENT')} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Mark All Present</button>
          <button type="button" onClick={() => markAll('ABSENT')} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Mark All Absent</button>
          <button type="button" onClick={() => markAll('LEAVE')} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white">Mark All Leave</button>
        </div>
      </div>

      {message && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">
          {message}
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Admission No.</th>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id}>
                  <td className="px-4 py-3 text-slate-500">{student.admissionNumber}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{student.name}</div>
                    <div className="text-xs text-slate-400">{student.class.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((option) => {
                        const selected = records[student.id] === option.value
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateStatus(student.id, option.value)}
                            className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                              selected
                                ? option.value === 'PRESENT'
                                  ? 'bg-emerald-600 text-white'
                                  : option.value === 'ABSENT'
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-amber-500 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <CheckCheck className="h-4 w-4 text-emerald-600" />
          <span>{totalStudents} students ready for update</span>
        </div>
        <button
          type="button"
          onClick={submitAttendance}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>
    </div>
  )
}

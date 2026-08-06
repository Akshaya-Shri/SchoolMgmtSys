'use client'

import { useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText, Filter, Search } from 'lucide-react'

interface MarkRow {
  id: string
  student: { id: string; name: string; admissionNumber: string; class: { name: string } }
  exam: { name: string }
  subject: { name: string }
  maxMark: number
  obtainedMark: number
  createdAt: string
}

interface MarksClientProps {
  initialMarks: MarkRow[]
  classes: { id: string; name: string; grade?: string; section?: string }[]
  subjects: { id: string; name: string }[]
  exams: { id: string; name: string }[]
}

export default function MarksClient({ initialMarks, classes, subjects, exams }: MarksClientProps) {
  const [marks, setMarks] = useState(initialMarks)
  const [search, setSearch] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [selectedExamId, setSelectedExamId] = useState('')
  const [academicYear, setAcademicYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const sections = useMemo(() => Array.from(new Set(classes.map((item) => item.section).filter(Boolean))), [classes])

  const filteredMarks = useMemo(() => {
    const term = search.trim().toLowerCase()
    return marks.filter((mark) => {
      const matchesSearch = !term ||
        mark.student.name.toLowerCase().includes(term) ||
        mark.student.admissionNumber.toLowerCase().includes(term) ||
        mark.subject.name.toLowerCase().includes(term) ||
        mark.exam.name.toLowerCase().includes(term)
      const matchesClass = !selectedClassId || mark.student.class.name === classes.find((item) => item.id === selectedClassId)?.name
      const matchesSection = !selectedSection || mark.student.class.name.includes(`-${selectedSection}`)
      const matchesSubject = !selectedSubjectId || mark.subject.name === subjects.find((item) => item.id === selectedSubjectId)?.name
      const matchesExam = !selectedExamId || mark.exam.name === exams.find((item) => item.id === selectedExamId)?.name
      return matchesSearch && matchesClass && matchesSection && matchesSubject && matchesExam
    })
  }, [classes, exams, marks, search, selectedClassId, selectedExamId, selectedSection, selectedSubjectId, subjects])

  const downloadReport = async (format: 'pdf' | 'xlsx') => {
    setLoading(true)
    setMessage(null)
    try {
      const params = new URLSearchParams({ format })
      if (selectedClassId) params.set('classId', selectedClassId)
      if (selectedSection) params.set('section', selectedSection)
      if (selectedSubjectId) params.set('subjectId', selectedSubjectId)
      if (selectedExamId) params.set('examId', selectedExamId)
      if (academicYear) params.set('academicYear', academicYear)

      const response = await fetch(`/api/staff/marks/report?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'Unable to download marks report.')
      }
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `Marks_Report.${format === 'xlsx' ? 'xlsx' : 'pdf'}`
      anchor.click()
      window.URL.revokeObjectURL(url)
      setMessage(`Marks report downloaded as ${format.toUpperCase()}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to download marks report.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">Marks</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Marks Overview & Report Downloads</h1>
            <p className="mt-2 text-sm text-slate-500">Search, filter, and export marks reports quickly.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => downloadReport('pdf')} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FileText className="h-4 w-4" />
              Download PDF
            </button>
            <button type="button" onClick={() => downloadReport('xlsx')} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700">
              <Download className="h-4 w-4" />
              Download Excel
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Search</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student or subject" className="w-full bg-transparent outline-none" />
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Class</span>
            <select value={selectedClassId} onChange={(event) => setSelectedClassId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <option value="">All Classes</option>
              {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Section</span>
            <select value={selectedSection} onChange={(event) => setSelectedSection(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <option value="">All Sections</option>
              {sections.map((section) => <option key={section} value={section}>{section}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Subject</span>
            <select value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <option value="">All Subjects</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Exam</span>
            <select value={selectedExamId} onChange={(event) => setSelectedExamId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <option value="">All Exams</option>
              {exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3">
          <Filter className="h-4 w-4 text-slate-400" />
          <input value={academicYear} onChange={(event) => setAcademicYear(event.target.value)} placeholder="Academic year e.g. 2025-2026" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" />
          <span className="text-sm text-slate-500">Use academic year filters for report export.</span>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">{message}</div>}

      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Class</th>
                <th className="px-4 py-3 font-semibold">Exam</th>
                <th className="px-4 py-3 font-semibold">Subject</th>
                <th className="px-4 py-3 font-semibold">Obtained</th>
                <th className="px-4 py-3 font-semibold">Maximum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMarks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">No marks found for the selected criteria.</td>
                </tr>
              ) : filteredMarks.map((mark) => (
                <tr key={mark.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{mark.student.name}</div>
                    <div className="text-xs text-slate-500">{mark.student.admissionNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{mark.student.class.name}</td>
                  <td className="px-4 py-3 text-slate-700">{mark.exam.name}</td>
                  <td className="px-4 py-3 text-slate-700">{mark.subject.name}</td>
                  <td className="px-4 py-3 text-slate-700">{mark.obtainedMark}</td>
                  <td className="px-4 py-3 text-slate-700">{mark.maxMark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Search, 
  UserPlus, 
  Eye, 
  X, 
  Calendar, 
  Phone, 
  User, 
  GraduationCap, 
  Award,
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react'

interface StudentRecord {
  id: string
  admissionNumber: string
  name: string
  gender: string
  dob: string
  parentName: string
  parentPhone: string
  attendancePercentage: number
  attendanceRawCount: { present: number; total: number }
  examMarks: {
    id: string
    examName: string
    subjectName: string
    obtainedMark: number
    maxMark: number
    percentage: number
    isDraft: boolean
  }[]
  leaveRequests: {
    id: string
    startDate: string
    endDate: string
    reason: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    remarks: string
  }[]
}

interface StudentsClientProps {
  classTeacherClass: { id: string; name: string }
  initialStudents: StudentRecord[]
}

export default function StudentsClient({ classTeacherClass, initialStudents }: StudentsClientProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null)
  const [profileTab, setProfileTab] = useState<'marks' | 'leaves'>('marks')
  const itemsPerPage = 10

  // Filter students based on search and gender
  const filteredStudents = initialStudents.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesGender = 
      genderFilter === 'All' || 
      student.gender.toLowerCase() === genderFilter.toLowerCase()

    return matchesSearch && matchesGender
  })

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Calculate exam stats for the profile modal
  const getExamSummaries = (student: StudentRecord) => {
    const examMap: { [examName: string]: { obtained: number; max: number; count: number } } = {}
    
    student.examMarks.forEach(mark => {
      if (!examMap[mark.examName]) {
        examMap[mark.examName] = { obtained: 0, max: 0, count: 0 }
      }
      examMap[mark.examName].obtained += mark.obtainedMark
      examMap[mark.examName].max += mark.maxMark
      examMap[mark.examName].count++
    })

    return Object.entries(examMap).map(([examName, data]) => {
      const percentage = data.max > 0 ? Math.round((data.obtained / data.max) * 100) : 0
      
      // Calculate simple Grade
      let grade = 'F'
      if (percentage >= 90) grade = 'A+'
      else if (percentage >= 80) grade = 'A'
      else if (percentage >= 70) grade = 'B'
      else if (percentage >= 60) grade = 'C'
      else if (percentage >= 50) grade = 'D'
      else if (percentage >= 35) grade = 'E'

      return {
        examName,
        totalObtained: data.obtained,
        totalMax: data.max,
        average: data.count > 0 ? Math.round(data.obtained / data.count) : 0,
        percentage,
        grade
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div className="rounded-3xl bg-white border border-slate-100 p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Class {classTeacherClass.name} Students
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage student profiles, academic performance, and attendance records.
            </p>
          </div>
          <Link
            href="/staff/students/bulk-upload"
            className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 hover:shadow-lg transition-all duration-200"
          >
            <UserPlus className="h-4 w-4" />
            Bulk Upload Students
          </Link>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4.5 w-4.5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search by Name, Admission Number, or Student ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="block w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-xs placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200"
          />
        </div>

        {/* Gender Filter */}
        <div className="w-full md:w-48 shrink-0">
          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="block w-full rounded-xl border border-slate-200 py-2.5 px-3 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all duration-200 bg-white"
          >
            <option value="All">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Student List Table */}
      <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Student ID</th>
                <th className="px-6 py-4">Admission No.</th>
                <th className="px-6 py-4">Student Name</th>
                <th className="px-6 py-4">Gender</th>
                <th className="px-6 py-4">Date of Birth</th>
                <th className="px-6 py-4">Parent details</th>
                <th className="px-6 py-4 text-center">Attendance %</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600">
              {paginatedStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/20">
                    <td className="px-6 py-4 font-bold text-slate-800">{student.id}</td>
                    <td className="px-6 py-4 text-slate-500">{student.admissionNumber}</td>
                    <td className="px-6 py-4 text-slate-800 font-semibold">{student.name}</td>
                    <td className="px-6 py-4">
                      <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold">
                        {student.gender.toLowerCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {new Date(student.dob).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 space-y-0.5">
                      <div className="text-slate-700 font-semibold">{student.parentName}</div>
                      <div className="text-slate-400 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {student.parentPhone}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold ${
                        student.attendancePercentage >= 85 
                          ? 'bg-emerald-50 text-emerald-700' 
                          : student.attendancePercentage >= 75 
                          ? 'bg-amber-50 text-amber-700' 
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {student.attendancePercentage}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-all duration-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View Profile
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 text-xs font-medium">
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-50 px-6 py-4 bg-slate-50/20">
            <span className="text-xs text-slate-500">
              Showing page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Profile Overlay Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-300">
          <div className="relative w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-50 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold text-base shadow">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{selectedStudent.name}</h3>
                  <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest mt-0.5">
                    Student ID: {selectedStudent.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedStudent(null);
                  setProfileTab('marks');
                }}
                className="rounded-xl border border-slate-150 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 bg-slate-50/50 p-5 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2.5 text-xs">
                  <User className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Admission Number</p>
                    <p className="text-slate-800 font-bold mt-0.5">{selectedStudent.admissionNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <Calendar className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Date of Birth</p>
                    <p className="text-slate-800 font-bold mt-0.5">{selectedStudent.dob}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 text-xs">
                  <GraduationCap className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
                  <div>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Attendance Rate</p>
                    <p className="text-slate-800 font-bold mt-0.5">{selectedStudent.attendancePercentage}%</p>
                  </div>
                </div>
              </div>

              {/* Sub-Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => setProfileTab('marks')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-4 transition-all ${
                    profileTab === 'marks'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Award className="h-4 w-4" />
                    Academic Marks
                  </div>
                </button>
                <button
                  onClick={() => setProfileTab('leaves')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-4 transition-all ${
                    profileTab === 'leaves'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="h-4 w-4" />
                    Leave History
                  </div>
                </button>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[150px]">
                {profileTab === 'marks' ? (
                  selectedStudent.examMarks.length > 0 ? (
                    <div className="space-y-6">
                      {/* Exam aggregate cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {getExamSummaries(selectedStudent).map((summary, idx) => (
                          <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between">
                            <div>
                              <h4 className="text-sm font-bold text-slate-800">{summary.examName}</h4>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Total: {summary.totalObtained}/{summary.totalMax} • Avg: {summary.average}%
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="inline-block rounded-lg bg-indigo-50 text-indigo-600 font-extrabold px-3 py-1.5 text-xs shadow-sm">
                                {summary.percentage}% (Grade {summary.grade})
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Detail scores table */}
                      <div className="rounded-2xl border border-slate-100 overflow-hidden">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              <th className="px-4 py-2.5">Exam</th>
                              <th className="px-4 py-2.5">Subject</th>
                              <th className="px-4 py-2.5 text-center">Marks Obtained</th>
                              <th className="px-4 py-2.5 text-center">Max Marks</th>
                              <th className="px-4 py-2.5 text-right">Percentage</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium">
                            {selectedStudent.examMarks.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50/10">
                                <td className="px-4 py-3 font-semibold text-slate-700">{m.examName}</td>
                                <td className="px-4 py-3 text-slate-700">{m.subjectName}</td>
                                <td className="px-4 py-3 text-center text-slate-800 font-bold">{m.obtainedMark}</td>
                                <td className="px-4 py-3 text-center text-slate-400">{m.maxMark}</td>
                                <td className="px-4 py-3 text-right font-bold text-indigo-600">{m.percentage}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      No examination marks entered yet for this student.
                    </div>
                  )
                ) : (
                  selectedStudent.leaveRequests.length > 0 ? (
                    <div className="rounded-2xl border border-slate-100 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            <th className="px-4 py-2.5">Duration Dates</th>
                            <th className="px-4 py-2.5">Reason for Leave</th>
                            <th className="px-4 py-2.5">Status</th>
                            <th className="px-4 py-2.5 text-right">Teacher Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-xs text-slate-600 font-medium">
                          {selectedStudent.leaveRequests.map((lr) => (
                            <tr key={lr.id} className="hover:bg-slate-50/10 align-top">
                              <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                                {new Date(lr.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - <br/>
                                {new Date(lr.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-slate-600 break-words leading-relaxed">{lr.reason}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-wide uppercase ${
                                  lr.status === 'APPROVED' 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : lr.status === 'REJECTED' 
                                    ? 'bg-rose-50 text-rose-700' 
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {lr.status.toLowerCase()}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right text-slate-500 italic max-w-xs truncate">
                                {lr.remarks || 'None'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-400 text-xs font-medium">
                      No leave applications submitted by this student.
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-50 px-6 py-4 bg-slate-50/10 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setProfileTab('marks');
                }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all shadow-sm"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import { Search, CheckCircle2, XCircle, RotateCcw, MessageSquare } from 'lucide-react'

interface LeaveRequestItem {
  id: string
  student: { name: string; admissionNumber: string }
  className: string
  startDate: string
  endDate: string
  reason: string
  createdAt: string
  status: string
  remarks?: string | null
}

interface LeaveRequestsClientProps {
  initialRequests: LeaveRequestItem[]
}

export default function LeaveRequestsClient({ initialRequests }: LeaveRequestsClientProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [remarks, setRemarks] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const filteredRequests = useMemo(() => {
    const term = search.trim().toLowerCase()
    return requests.filter((request) => {
      const matchesSearch = !term || request.student.name.toLowerCase().includes(term) || request.reason.toLowerCase().includes(term)
      const matchesStatus = !statusFilter || request.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [requests, search, statusFilter])

  const openDecision = (request: LeaveRequestItem) => {
    setSelectedRequestId(request.id)
    setRemarks(request.remarks || '')
  }

  const submitDecision = async (status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    if (!selectedRequestId) return
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/staff/leave-requests/${selectedRequestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, remarks }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to update leave request.')
      setRequests((current) => current.map((request) => request.id === selectedRequestId ? { ...request, status, remarks } : request))
      setSelectedRequestId(null)
      setRemarks('')
      setMessage(`Leave request marked as ${status.toLowerCase()}.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update leave request.')
    } finally {
      setSaving(false)
    }
  }

  const badge = (status: string) => {
    if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-700'
    if (status === 'REJECTED') return 'bg-rose-50 text-rose-700'
    return 'bg-amber-50 text-amber-700'
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">Leave Requests</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Class Leave Management</h1>
            <p className="mt-2 text-sm text-slate-500">Review leave applications for your assigned class and update status instantly.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Search</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Student or reason" className="w-full bg-transparent outline-none" />
            </div>
          </label>
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
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
                <th className="px-4 py-3 font-semibold">Leave Dates</th>
                <th className="px-4 py-3 font-semibold">Reason</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">No leave requests found.</td>
                </tr>
              ) : filteredRequests.map((request) => (
                <tr key={request.id}>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{request.student.name}</div>
                    <div className="text-xs text-slate-500">{request.student.admissionNumber}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{request.className}</td>
                  <td className="px-4 py-3 text-slate-700">{new Date(request.startDate).toLocaleDateString()} → {new Date(request.endDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-700">{request.reason}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge(request.status)}`}>{request.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openDecision(request)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><MessageSquare className="h-3.5 w-3.5" />Review</button>
                      <button type="button" onClick={() => submitDecision('APPROVED')} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" />Approve</button>
                      <button type="button" onClick={() => submitDecision('REJECTED')} className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white"><XCircle className="h-3.5 w-3.5" />Reject</button>
                      <button type="button" onClick={() => submitDecision('PENDING')} className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white"><RotateCcw className="h-3.5 w-3.5" />Pending</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Teacher Remarks</h2>
            <p className="mt-2 text-sm text-slate-600">Add notes before approving or rejecting.</p>
            <textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} rows={4} className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2" />
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setSelectedRequestId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => submitDecision('APPROVED')} disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">Approve</button>
              <button type="button" onClick={() => submitDecision('REJECTED')} disabled={saving} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

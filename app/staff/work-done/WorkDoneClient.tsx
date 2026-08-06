'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, Pencil, Trash2, CheckCircle2 } from 'lucide-react'

interface WorkDoneItem {
  id: string
  date: string
  class: { name: string }
  subject: { name: string }
  topic: string
  description?: string | null
  staffId: string
}

interface WorkDoneClientProps {
  initialEntries: WorkDoneItem[]
  classes: { id: string; name: string }[]
  subjects: { id: string; name: string }[]
  currentStaffId: string
}

export default function WorkDoneClient({ initialEntries, classes, subjects, currentStaffId }: WorkDoneClientProps) {
  const [entries, setEntries] = useState(initialEntries)
  const [search, setSearch] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)
  const [form, setForm] = useState({ classId: '', subjectId: '', date: '', topic: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const filteredEntries = useMemo(() => {
    const term = search.trim().toLowerCase()
    return entries.filter((entry) => {
      const matchesSearch = !term || entry.topic.toLowerCase().includes(term) || entry.description?.toLowerCase().includes(term) || entry.class.name.toLowerCase().includes(term) || entry.subject.name.toLowerCase().includes(term)
      const matchesClass = !selectedClassId || entry.class.name === classes.find((item) => item.id === selectedClassId)?.name
      const matchesSubject = !selectedSubjectId || entry.subject.name === subjects.find((item) => item.id === selectedSubjectId)?.name
      return matchesSearch && matchesClass && matchesSubject
    })
  }, [classes, entries, search, selectedClassId, selectedSubjectId, subjects])

  const resetForm = () => {
    setForm({ classId: '', subjectId: '', date: '', topic: '', description: '' })
    setEditingEntryId(null)
  }

  const openCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEdit = (entry: WorkDoneItem) => {
    setEditingEntryId(entry.id)
    setForm({
      classId: classes.find((item) => item.name === entry.class.name)?.id || '',
      subjectId: subjects.find((item) => item.name === entry.subject.name)?.id || '',
      date: entry.date.slice(0, 10),
      topic: entry.topic,
      description: entry.description || '',
    })
    setIsModalOpen(true)
  }

  const submit = async () => {
    if (!form.classId || !form.subjectId || !form.date || !form.topic) return
    setSaving(true)
    setMessage(null)
    try {
      const method = editingEntryId ? 'PUT' : 'POST'
      const endpoint = editingEntryId ? `/api/staff/work-done/${editingEntryId}` : '/api/staff/work-done'
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to save work done entry.')
      const nextEntry = payload.data
      if (editingEntryId) {
        setEntries((current) => current.map((entry) => entry.id === editingEntryId ? { ...entry, ...nextEntry, class: { name: classes.find((item) => item.id === form.classId)?.name || entry.class.name }, subject: { name: subjects.find((item) => item.id === form.subjectId)?.name || entry.subject.name } } : entry))
      } else {
        setEntries((current) => [{ id: nextEntry.id, date: nextEntry.date, class: { name: classes.find((item) => item.id === form.classId)?.name || '' }, subject: { name: subjects.find((item) => item.id === form.subjectId)?.name || '' }, topic: nextEntry.topic, description: nextEntry.description, staffId: currentStaffId }, ...current])
      }
      setIsModalOpen(false)
      resetForm()
      setMessage(editingEntryId ? 'Work done entry updated.' : 'Work done entry added.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save work done entry.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async (id: string) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/staff/work-done/${id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to delete work done entry.')
      setEntries((current) => current.filter((entry) => entry.id !== id))
      setMessage('Work done entry deleted.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete work done entry.')
    } finally {
      setSaving(false)
      setDeleteTargetId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">Work Done</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Manage Teaching Work Done</h1>
            <p className="mt-2 text-sm text-slate-500">Add, update, search, and review your work done entries.</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Add Entry
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Search</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Topic or description" className="w-full bg-transparent outline-none" />
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
            <span className="font-semibold">Subject</span>
            <select value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
              <option value="">All Subjects</option>
              {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {message && <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">{message}</div>}

      <div className="space-y-4">
        {filteredEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No work done entries found for the selected filters.</div>
        ) : filteredEntries.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{entry.class.name} • {entry.subject.name}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{entry.topic}</h3>
                <p className="mt-2 text-sm text-slate-600">{entry.description || 'No additional description provided.'}</p>
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {new Date(entry.date).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(entry)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setDeleteTargetId(entry.id)} className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">{editingEntryId ? 'Edit Work Done' : 'Add Work Done'}</h2>
            <div className="mt-5 grid gap-4">
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-semibold">Date</span>
                <input type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  <span className="font-semibold">Class</span>
                  <select value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2">
                    <option value="">Select class</option>
                    {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  <span className="font-semibold">Subject</span>
                  <select value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2">
                    <option value="">Select subject</option>
                    {subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-semibold">Topic</span>
                <input value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-semibold">Description</span>
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm() }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">{saving ? 'Saving...' : editingEntryId ? 'Update Entry' : 'Save Entry'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Delete Entry?</h2>
            <p className="mt-2 text-sm text-slate-600">This action cannot be undone. Continue?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteTargetId(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={() => confirmDelete(deleteTargetId)} disabled={saving} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white">{saving ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

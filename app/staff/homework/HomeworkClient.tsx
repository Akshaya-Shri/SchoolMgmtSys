'use client'

import { useMemo, useState } from 'react'
import { Plus, Search, Paperclip, Pencil, Trash2 } from 'lucide-react'

interface HomeworkItem {
  id: string
  class: { name: string }
  subject: { name: string }
  title: string
  description: string
  assignedDate: string
  dueDate: string
  attachments: { id: string; fileName: string; filePath: string }[]
  staffId: string
}

interface HomeworkClientProps {
  initialHomework: HomeworkItem[]
  classes: { id: string; name: string }[]
  subjects: { id: string; name: string }[]
  currentStaffId: string
}

export default function HomeworkClient({ initialHomework, classes, subjects, currentStaffId }: HomeworkClientProps) {
  const [homework, setHomework] = useState(initialHomework)
  const [search, setSearch] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ classId: '', subjectId: '', title: '', description: '', assignedDate: '', dueDate: '', attachment: null as File | null })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const filteredHomework = useMemo(() => {
    const term = search.trim().toLowerCase()
    return homework.filter((item) => {
      const matchesSearch = !term || item.title.toLowerCase().includes(term) || item.description.toLowerCase().includes(term) || item.class.name.toLowerCase().includes(term) || item.subject.name.toLowerCase().includes(term)
      const matchesClass = !selectedClassId || item.class.name === classes.find((classItem) => classItem.id === selectedClassId)?.name
      const matchesSubject = !selectedSubjectId || item.subject.name === subjects.find((subjectItem) => subjectItem.id === selectedSubjectId)?.name
      return matchesSearch && matchesClass && matchesSubject
    })
  }, [classes, homework, search, selectedClassId, selectedSubjectId, subjects])

  const resetForm = () => {
    setForm({ classId: '', subjectId: '', title: '', description: '', assignedDate: '', dueDate: '', attachment: null })
    setEditingId(null)
  }

  const openCreate = () => {
    resetForm()
    setIsModalOpen(true)
  }

  const openEdit = (item: HomeworkItem) => {
    setEditingId(item.id)
    setForm({
      classId: classes.find((classItem) => classItem.name === item.class.name)?.id || '',
      subjectId: subjects.find((subjectItem) => subjectItem.name === item.subject.name)?.id || '',
      title: item.title,
      description: item.description,
      assignedDate: item.assignedDate.slice(0, 10),
      dueDate: item.dueDate.slice(0, 10),
      attachment: null,
    })
    setIsModalOpen(true)
  }

  const submit = async () => {
    if (!form.classId || !form.subjectId || !form.title || !form.assignedDate || !form.dueDate) return
    setSaving(true)
    setMessage(null)
    try {
      const endpoint = editingId ? `/api/staff/homework/${editingId}` : '/api/staff/homework'
      const method = editingId ? 'PUT' : 'POST'
      const formData = new FormData()
      formData.append('classId', form.classId)
      formData.append('subjectId', form.subjectId)
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('assignedDate', form.assignedDate)
      formData.append('dueDate', form.dueDate)
      if (form.attachment) formData.append('attachment', form.attachment)
      const response = await fetch(endpoint, { method, body: formData })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to save homework.')
      const nextItem = payload.data
      if (editingId) {
        setHomework((current) => current.map((item) => item.id === editingId ? { ...item, ...nextItem, class: { name: classes.find((classItem) => classItem.id === form.classId)?.name || item.class.name }, subject: { name: subjects.find((subjectItem) => subjectItem.id === form.subjectId)?.name || item.subject.name }, title: nextItem.title, description: nextItem.description, assignedDate: nextItem.assignedDate, dueDate: nextItem.dueDate, attachments: item.attachments } : item))
      } else {
        setHomework((current) => [{ id: nextItem.id, class: { name: classes.find((classItem) => classItem.id === form.classId)?.name || '' }, subject: { name: subjects.find((subjectItem) => subjectItem.id === form.subjectId)?.name || '' }, title: nextItem.title, description: nextItem.description, assignedDate: nextItem.assignedDate, dueDate: nextItem.dueDate, attachments: [], staffId: currentStaffId }, ...current])
      }
      setIsModalOpen(false)
      resetForm()
      setMessage(editingId ? 'Homework updated.' : 'Homework created.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save homework.')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async (id: string) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/staff/homework/${id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to delete homework.')
      setHomework((current) => current.filter((item) => item.id !== id))
      setMessage('Homework deleted.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete homework.')
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
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-indigo-600">Homework</p>
            <h1 className="text-2xl font-extrabold text-slate-900">Allocate Homework</h1>
            <p className="mt-2 text-sm text-slate-500">Create, update, search, and manage homework with attachments.</p>
          </div>
          <button type="button" onClick={openCreate} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700">
            <Plus className="h-4 w-4" />
            Create Homework
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <label className="flex flex-col gap-2 text-sm text-slate-600">
            <span className="font-semibold">Search</span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or description" className="w-full bg-transparent outline-none" />
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
        {filteredHomework.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">No homework entries found for the selected filters.</div>
        ) : filteredHomework.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">{item.class.name} • {item.subject.name}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                {item.attachments.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.attachments.map((attachment) => (
                      <a key={attachment.id} href={attachment.filePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                        <Paperclip className="h-3.5 w-3.5" />
                        {attachment.fileName}
                      </a>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-start gap-2 md:items-end">
                <p className="text-sm text-slate-500">Assigned: {new Date(item.assignedDate).toLocaleDateString()}</p>
                <p className="text-sm text-slate-500">Due: {new Date(item.dueDate).toLocaleDateString()}</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(item)} className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setDeleteTargetId(item.id)} className="rounded-xl border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
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
            <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Homework' : 'Create Homework'}</h2>
            <div className="mt-5 grid gap-4">
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
                <span className="font-semibold">Title</span>
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-semibold">Description</span>
                <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  <span className="font-semibold">Assigned Date</span>
                  <input type="date" value={form.assignedDate} onChange={(event) => setForm((current) => ({ ...current, assignedDate: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                </label>
                <label className="flex flex-col gap-2 text-sm text-slate-600">
                  <span className="font-semibold">Due Date</span>
                  <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2" />
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm text-slate-600">
                <span className="font-semibold">Attachment</span>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setForm((current) => ({ ...current, attachment: event.target.files?.[0] || null }))} className="rounded-xl border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { setIsModalOpen(false); resetForm() }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">Cancel</button>
              <button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">{saving ? 'Saving...' : editingId ? 'Update Homework' : 'Create Homework'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-900">Delete Homework?</h2>
            <p className="mt-2 text-sm text-slate-600">This action will also remove any uploaded attachments. Continue?</p>
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

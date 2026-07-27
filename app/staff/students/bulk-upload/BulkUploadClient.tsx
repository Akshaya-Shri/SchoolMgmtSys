'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { 
  Upload, 
  Download, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  FileSpreadsheet,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2
} from 'lucide-react'

interface ClassTeacherClass {
  id: string
  name: string
  grade: string
  section: string
}

interface ValidRecord {
  admissionNumber: string
  name: string
  dob: string // YYYY-MM-DD format
  gender: string
  parentName: string
  parentPhone: string
}

interface InvalidRecord extends Partial<ValidRecord> {
  rowNumber: number
  errors: string[]
}

interface BulkUploadClientProps {
  classTeacherClass: ClassTeacherClass
}

export default function BulkUploadClient({ classTeacherClass }: BulkUploadClientProps) {
  const [file, setFile] = useState<File | null>(null)
  const [validRecords, setValidRecords] = useState<ValidRecord[]>([])
  const [invalidRecords, setInvalidRecords] = useState<InvalidRecord[]>([])
  const [activeTab, setActiveTab] = useState<'valid' | 'invalid'>('valid')
  const [isUploading, setIsUploading] = useState(false)
  const [importSummary, setImportSummary] = useState<{
    success: number
    duplicate: number
    failed: number
  } | null>(null)
  const [credentials, setCredentials] = useState<{
    admissionNumber: string
    name: string
    studentId: string
    tempPassword: string
  }[] | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. Generate & Download Excel Template
  const downloadTemplate = () => {
    const headers = [
      'Admission Number',
      'Student Name',
      'Date of Birth',
      'Gender',
      'Parent Name',
      'Parent Phone',
      'Class',
      'Section'
    ]

    const sampleRow = [
      'ADM2026101',
      'Rahul Kumar',
      '2012-05-15',
      'Male',
      'Sanjay Kumar',
      '9876543211',
      classTeacherClass.grade,
      classTeacherClass.section
    ]

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Students Template')
    
    // Write out workbook
    XLSX.writeFile(wb, `Student_Import_Template_${classTeacherClass.name}.xlsx`)
  }

  // 2. Parse Excel File
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setImportSummary(null)
    setCredentials(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result
        // Parse workbook, parsing date cells to Date objects
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        // Convert sheet to JSON array
        const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[]
        
        if (rawRows.length <= 1) {
          alert('Excel sheet is empty or contains only headers.')
          return
        }

        const headers = rawRows[0].map((h: any) => h?.toString().trim().toLowerCase())
        
        // Validate headers map to expected indices
        const colIndices = {
          admissionNumber: headers.indexOf('admission number'),
          name: headers.indexOf('student name'),
          dob: headers.indexOf('date of birth'),
          gender: headers.indexOf('gender'),
          parentName: headers.indexOf('parent name'),
          parentPhone: headers.indexOf('parent phone'),
          class: headers.indexOf('class'),
          section: headers.indexOf('section')
        }

        // Check if any column header is missing
        const missingHeaders = Object.entries(colIndices)
          .filter(([_, index]) => index === -1)
          .map(([name]) => name)
        
        if (missingHeaders.length > 0) {
          alert(`Invalid columns found. Missing: ${missingHeaders.join(', ')}`)
          return
        }

        const valid: ValidRecord[] = []
        const invalid: InvalidRecord[] = []
        const seenAdmissions = new Set<string>()

        // Process data rows
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i]
          // Skip completely empty rows
          if (row.length === 0 || row.every((cell: any) => cell === null || cell === undefined || cell === '')) {
            continue
          }

          const rowNum = i + 1
          const errors: string[] = []

          // Extract and sanitize cell values
          const admissionNumber = row[colIndices.admissionNumber]?.toString().trim() || ''
          const name = row[colIndices.name]?.toString().trim() || ''
          let dobRaw = row[colIndices.dob]
          const gender = row[colIndices.gender]?.toString().trim() || ''
          const parentName = row[colIndices.parentName]?.toString().trim() || ''
          const parentPhone = row[colIndices.parentPhone]?.toString().trim().replace(/[-\s]/g, '') || ''
          const rowClass = row[colIndices.class]?.toString().trim() || ''
          const rowSection = row[colIndices.section]?.toString().trim() || ''

          // Validate Admission Number
          if (!admissionNumber) {
            errors.push('Admission Number is required.')
          } else if (seenAdmissions.has(admissionNumber)) {
            errors.push(`Duplicate admission number "${admissionNumber}" within this file.`)
          } else {
            seenAdmissions.add(admissionNumber)
          }

          // Validate Student Name
          if (!name) {
            errors.push('Student Name is required.')
          }

          // Validate DOB
          let dobFormatted = ''
          if (!dobRaw) {
            errors.push('Date of Birth is required.')
          } else {
            // Excel cellDates: true handles Date objects. If it's a string, we check formatting.
            let dateObj: Date | null = null
            if (dobRaw instanceof Date) {
              dateObj = dobRaw
            } else {
              dateObj = new Date(dobRaw.toString())
            }

            if (isNaN(dateObj.getTime())) {
              errors.push(`Invalid DOB format: "${dobRaw}". Use YYYY-MM-DD format.`)
            } else {
              // Convert to YYYY-MM-DD
              const y = dateObj.getFullYear()
              const m = (dateObj.getMonth() + 1).toString().padStart(2, '0')
              const d = dateObj.getDate().toString().padStart(2, '0')
              dobFormatted = `${y}-${m}-${d}`

              // Validate age sanity (4 - 20 years old)
              const age = new Date().getFullYear() - y
              if (age < 4 || age > 20) {
                errors.push(`Age is invalid (${age} years). Expected student age between 4 and 20.`)
              }
            }
          }

          // Validate Gender
          if (!gender) {
            errors.push('Gender is required.')
          } else if (!['male', 'female', 'other'].includes(gender.toLowerCase())) {
            errors.push(`Invalid Gender: "${gender}". Expected Male, Female, or Other.`)
          }

          // Validate Parent Name
          if (!parentName) {
            errors.push('Parent Name is required.')
          }

          // Validate Parent Phone
          if (!parentPhone) {
            errors.push('Parent Phone is required.')
          } else if (!/^\d{10}$/.test(parentPhone)) {
            errors.push(`Invalid phone format: "${parentPhone}". Phone must be exactly 10 digits.`)
          }

          // Validate Class & Section
          if (!rowClass || !rowSection) {
            errors.push('Class and Section are required.')
          } else {
            const classMatches = rowClass.toString().toLowerCase() === classTeacherClass.grade.toLowerCase()
            const sectionMatches = rowSection.toString().toLowerCase() === classTeacherClass.section.toLowerCase()
            
            if (!classMatches || !sectionMatches) {
              errors.push(
                `Class mismatch: "${rowClass}-${rowSection}". You are only assigned to class "${classTeacherClass.name}".`
              )
            }
          }

          if (errors.length > 0) {
            invalid.push({
              rowNumber: rowNum,
              admissionNumber,
              name,
              dob: dobFormatted,
              gender,
              parentName,
              parentPhone,
              errors
            })
          } else {
            valid.push({
              admissionNumber,
              name,
              dob: dobFormatted,
              gender,
              parentName,
              parentPhone
            })
          }
        }

        setValidRecords(valid)
        setInvalidRecords(invalid)
        setActiveTab(valid.length > 0 ? 'valid' : 'invalid')
      } catch (err) {
        console.error('Error parsing excel:', err)
        alert('Could not parse the Excel file. Please ensure it is a valid Excel format.')
      }
    }
    reader.readAsArrayBuffer(selectedFile)
  }

  // 3. Confirm and Import Valid Records
  const handleImport = async () => {
    if (validRecords.length === 0) return
    setIsUploading(true)
    setImportSummary(null)

    try {
      const response = await fetch('/api/staff/students/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          students: validRecords,
          classId: classTeacherClass.id
        })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to import students.')
        setIsUploading(false)
        return
      }

      setImportSummary(data.summary)
      
      // Store credentials list
      const successList = data.importedList.filter((s: any) => s.status === 'success')
      setCredentials(successList)

      // Clear file lists
      setValidRecords([])
      setInvalidRecords([])
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Error during import:', err)
      alert('An error occurred during database import.')
    } finally {
      setIsUploading(false)
    }
  }

  // 4. Download Error Report
  const downloadErrorReport = () => {
    if (invalidRecords.length === 0) return
    let content = `Student Import Error Report - Class ${classTeacherClass.name}\n`
    content += `Generated on: ${new Date().toLocaleString()}\n`
    content += `===============================================\n\n`

    invalidRecords.forEach(rec => {
      content += `Row ${rec.rowNumber}: Student Name: ${rec.name || 'N/A'}, Admission: ${rec.admissionNumber || 'N/A'}\n`
      rec.errors.forEach(err => {
        content += ` - ${err}\n`
      })
      content += `-----------------------------------------------\n`
    })

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Import_Errors_Class_${classTeacherClass.name}.txt`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 5. Download Credentials Report
  const downloadCredentials = () => {
    if (!credentials || credentials.length === 0) return
    let csv = 'Admission Number,Student Name,Username / Student ID,Temporary Password\n'
    
    credentials.forEach(c => {
      // Escape name commas
      const escapedName = c.name.includes(',') ? `"${c.name}"` : c.name
      csv += `${c.admissionNumber},${escapedName},${c.studentId},${c.tempPassword}\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Student_Credentials_${classTeacherClass.name}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-3xl bg-white border border-slate-100 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              Bulk Upload Students
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Add new students to your assigned class <span className="font-semibold text-indigo-600">{classTeacherClass.name}</span>.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all duration-200"
          >
            <Download className="h-4 w-4 text-slate-500" />
            Download Excel Template
          </button>
        </div>
      </div>

      {/* Main Upload Selector */}
      {!file && !importSummary && (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center transition-all duration-200 hover:border-indigo-400">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-800">Upload your student list</h3>
          <p className="mt-1.5 text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Select the filled Excel template file. Ensure all columns match the layout and rows belong to Class {classTeacherClass.name}.
          </p>
          <div className="mt-6 flex justify-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all"
            >
              Choose Excel File
            </button>
          </div>
        </div>
      )}

      {/* Summary / Success screen */}
      {importSummary && (
        <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">Database Sync Complete</h3>
              <p className="text-xs text-slate-500">Records processed for Class {classTeacherClass.name}</p>
            </div>
          </div>

          {/* Stats count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="rounded-2xl bg-emerald-50/50 border border-emerald-100/50 p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Imported Successfully</span>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{importSummary.success}</p>
            </div>
            <div className="rounded-2xl bg-amber-50/50 border border-amber-100/50 p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Duplicates Detected</span>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{importSummary.duplicate}</p>
            </div>
            <div className="rounded-2xl bg-rose-50/50 border border-rose-100/50 p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Failed Insertions</span>
              <p className="text-3xl font-extrabold text-slate-800 mt-1">{importSummary.failed}</p>
            </div>
          </div>

          {/* Action section */}
          <div className="rounded-2xl bg-slate-50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-slate-100">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-slate-800">Download Student Credentials</h4>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Download the generated Student IDs and temporary passwords to hand over to the students for their initial log-in.
                </p>
              </div>
            </div>
            <button
              onClick={downloadCredentials}
              disabled={!credentials || credentials.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none shrink-0 transition-all"
            >
              <Download className="h-4 w-4" />
              Download Credentials (CSV)
            </button>
          </div>

          <div className="flex justify-start">
            <button
              onClick={() => {
                setImportSummary(null);
                setCredentials(null);
              }}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Upload Another List
            </button>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {file && (validRecords.length > 0 || invalidRecords.length > 0) && (
        <div className="rounded-3xl border border-slate-100 bg-white shadow-sm overflow-hidden space-y-6 p-6">
          {/* Header area */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-4">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-6 w-6 text-indigo-600" />
              <div>
                <h3 className="text-base font-bold text-slate-800">{file.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Previewing file records before importing</p>
              </div>
            </div>
            {invalidRecords.length > 0 && (
              <button
                onClick={downloadErrorReport}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all shrink-0"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Download Error Report
              </button>
            )}
          </div>

          {/* Tab selectors */}
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => setActiveTab('valid')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-4 transition-all ${
                activeTab === 'valid'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Valid Records ({validRecords.length})
            </button>
            <button
              onClick={() => setActiveTab('invalid')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-4 transition-all ${
                activeTab === 'invalid'
                  ? 'border-rose-600 text-rose-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Invalid Records ({invalidRecords.length})
            </button>
          </div>

          {/* Tables */}
          <div className="overflow-x-auto min-h-[250px]">
            {activeTab === 'valid' ? (
              validRecords.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Admission No.</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Date of Birth</th>
                      <th className="px-4 py-3">Gender</th>
                      <th className="px-4 py-3">Parent Name</th>
                      <th className="px-4 py-3">Parent Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600">
                    {validRecords.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20">
                        <td className="px-4 py-3.5 text-slate-800 font-bold">{rec.admissionNumber}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{rec.name}</td>
                        <td className="px-4 py-3.5">{rec.dob}</td>
                        <td className="px-4 py-3.5">
                          <span className="capitalize px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold">
                            {rec.gender.toLowerCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">{rec.parentName}</td>
                        <td className="px-4 py-3.5">{rec.parentPhone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  No valid records found in the Excel sheet.
                </div>
              )
            ) : (
              invalidRecords.length > 0 ? (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3 w-16">Row</th>
                      <th className="px-4 py-3">Admission No.</th>
                      <th className="px-4 py-3">Student Name</th>
                      <th className="px-4 py-3">Errors / Validation Failure Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-600">
                    {invalidRecords.map((rec, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/20 align-top">
                        <td className="px-4 py-3.5 text-slate-400 font-semibold">{rec.rowNumber}</td>
                        <td className="px-4 py-3.5 text-slate-800 font-bold">{rec.admissionNumber || 'N/A'}</td>
                        <td className="px-4 py-3.5 text-slate-700 font-semibold">{rec.name || 'N/A'}</td>
                        <td className="px-4 py-3.5 text-rose-600 space-y-1">
                          {rec.errors.map((err, errIdx) => (
                            <div key={errIdx} className="flex items-center gap-1.5 font-semibold">
                              <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-500" />
                              <span>{err}</span>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs font-medium">
                  Zero invalid records! Everything looks perfect.
                </div>
              )
            )}
          </div>

          {/* Footer Submit confirmation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-50 pt-6 gap-4">
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Only the <span className="font-semibold text-slate-700">{validRecords.length} valid records</span> will be imported. Please review and resolve any invalid records in your local template sheet and re-upload if necessary.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setValidRecords([]);
                  setInvalidRecords([]);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImport}
                disabled={validRecords.length === 0 || isUploading}
                className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none transition-all"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    Import {validRecords.length} Students
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

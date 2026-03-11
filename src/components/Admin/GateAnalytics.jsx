import { useEffect, useMemo, useState } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { cpanelApi } from '../../lib/cpanelApi'
import './GateAnalytics.css'

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

const GateAnalytics = () => {
  const [entryDate, setEntryDate] = useState(todayIsoDate())
  const [search, setSearch] = useState('')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [isExportingCsv, setIsExportingCsv] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const summary = useMemo(() => {
    const total = records.length
    const methods = records.reduce((acc, row) => {
      const key = String(row?.entry_method || 'manual').toLowerCase()
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    return {
      total,
      qr: methods.qr || 0,
      manual: methods.manual || 0,
      search: methods.search || 0
    }
  }, [records])

  const fetchRecords = async ({ all = false, q = search, date = entryDate } = {}) => {
    setLoading(true)
    setError('')
    setMessage('')

    try {
      const response = await cpanelApi.adminListGateEntries({
        all,
        entryDate: all ? undefined : date,
        search: q,
        limit: 50000,
        offset: 0
      })
      setRecords(Array.isArray(response?.records) ? response.records : [])
    } catch (fetchError) {
      setError(fetchError?.message || 'Unable to load gate records')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecords({ all: false, q: '', date: entryDate })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDelete = async (entryId) => {
    const shouldDelete = window.confirm('Delete this gate entry record? This cannot be undone.')
    if (!shouldDelete) return

    setDeletingId(entryId)
    setError('')
    setMessage('')

    try {
      await cpanelApi.adminDeleteGateEntry({ entryId })
      setMessage('Entry deleted successfully')
      await fetchRecords({ all: false })
    } catch (deleteError) {
      setError(deleteError?.message || 'Unable to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const downloadFile = ({ content, mimeType, fileName }) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const csvEscape = (value) => {
    const str = value === null || value === undefined ? '' : String(value)
    return `"${str.replace(/"/g, '""')}"`
  }

  const handleExportCsv = async () => {
    setIsExportingCsv(true)
    setError('')
    setMessage('')

    try {
      const response = await cpanelApi.adminListGateEntries({ all: true, limit: 50000, offset: 0 })
      const rows = Array.isArray(response?.records) ? response.records : []

      if (rows.length === 0) {
        setError('No records available to export')
        return
      }

      const headers = ['ID', 'Date', 'Time', 'Student Name', 'Student Code', 'Department', 'Year', 'Method', 'Entry By']
      const lines = rows.map((row) => ([
        row.id,
        row.entry_date,
        row.entry_at,
        row.student_name,
        row.student_code,
        row.student_department || '-',
        row.student_year || '-',
        row.entry_method,
        row.entry_by
      ].map(csvEscape).join(',')))

      const content = [headers.join(','), ...lines].join('\n')
      const today = new Date().toISOString().slice(0, 10)
      downloadFile({
        content,
        mimeType: 'text/csv;charset=utf-8',
        fileName: `gate_analytics_${today}.csv`
      })
      setMessage(`Exported ${rows.length} records to CSV`)
    } catch (exportError) {
      setError(exportError?.message || 'Unable to export CSV')
    } finally {
      setIsExportingCsv(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    setError('')
    setMessage('')

    try {
      const response = await cpanelApi.adminListGateEntries({ all: true, limit: 50000, offset: 0 })
      const rows = Array.isArray(response?.records) ? response.records : []

      if (rows.length === 0) {
        setError('No records available to export')
        return
      }

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      doc.setFontSize(12)
      doc.text('Gate Analytics Records', 40, 36)

      doc.autoTable({
        startY: 50,
        head: [['ID', 'Date', 'Time', 'Student', 'Code', 'Department', 'Year', 'Method', 'By']],
        body: rows.map((row) => [
          row.id,
          row.entry_date || '',
          row.entry_at || '',
          row.student_name || '',
          row.student_code || '',
          row.student_department || '-',
          row.student_year || '-',
          row.entry_method || '',
          row.entry_by || ''
        ]),
        styles: { fontSize: 8, cellPadding: 4 },
        headStyles: { fillColor: [74, 20, 140] }
      })

      const today = new Date().toISOString().slice(0, 10)
      doc.save(`gate_analytics_${today}.pdf`)
      setMessage(`Exported ${rows.length} records to PDF`)
    } catch (exportError) {
      setError(exportError?.message || 'Unable to export PDF')
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <section className="gate-analytics">
      <div className="gate-analytics-header">
        <div>
          <h2>Gate Analytics</h2>
          <p>View, delete, and export gate entry records.</p>
        </div>
        <div className="gate-analytics-actions">
          <button type="button" className="gate-analytics-btn" onClick={handleExportCsv} disabled={isExportingCsv || isExportingPdf}>
            {isExportingCsv ? 'Exporting CSV...' : 'Export CSV'}
          </button>
          <button type="button" className="gate-analytics-btn" onClick={handleExportPdf} disabled={isExportingPdf || isExportingCsv}>
            {isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
          </button>
        </div>
      </div>

      <div className="gate-analytics-summary">
        <div className="summary-pill">Total: {summary.total}</div>
        <div className="summary-pill">QR: {summary.qr}</div>
        <div className="summary-pill">Manual: {summary.manual}</div>
        <div className="summary-pill">Search: {summary.search}</div>
      </div>

      <div className="gate-analytics-filters">
        <label>
          Entry Date
          <input
            type="date"
            value={entryDate}
            onChange={(e) => setEntryDate(e.target.value)}
          />
        </label>
        <label className="search-label">
          Search
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Code, name, department, year, entry by"
          />
        </label>
        <button type="button" className="gate-analytics-btn" onClick={() => fetchRecords({ all: false })} disabled={loading}>
          {loading ? 'Loading...' : 'Apply'}
        </button>
        <button type="button" className="gate-analytics-btn muted" onClick={() => fetchRecords({ all: true })} disabled={loading}>
          {loading ? 'Loading...' : 'View All'}
        </button>
      </div>

      {error ? <div className="gate-analytics-alert error">{error}</div> : null}
      {message ? <div className="gate-analytics-alert success">{message}</div> : null}

      <div className="gate-analytics-table-wrap">
        <table className="gate-analytics-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Student</th>
              <th>Code</th>
              <th>Department</th>
              <th>Year</th>
              <th>Method</th>
              <th>By</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">No gate records found.</td>
              </tr>
            ) : records.map((record) => (
              <tr key={record.id}>
                <td>{record.entry_date || '-'}</td>
                <td>{record.entry_at || '-'}</td>
                <td>{record.student_name || '-'}</td>
                <td>{record.student_code || '-'}</td>
                <td>{record.student_department || '-'}</td>
                <td>{record.student_year || '-'}</td>
                <td>{record.entry_method || '-'}</td>
                <td>{record.entry_by || '-'}</td>
                <td>
                  <button
                    type="button"
                    className="gate-analytics-delete"
                    onClick={() => handleDelete(record.id)}
                    disabled={deletingId === record.id}
                  >
                    {deletingId === record.id ? 'Deleting...' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export default GateAnalytics

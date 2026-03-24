import { useEffect, useMemo, useState } from 'react'
import { cpanelApi } from '../../lib/cpanelApi'
import './GatePassTermsReport.css'

const formatAcceptedAt = (value) => {
  if (!value) {
    return '-'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return String(value)
  }

  return parsed.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const normalizePaymentState = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'approved') return 'approved'
  if (normalized === 'declined') return 'declined'
  return 'pending'
}

const getPaymentBadge = ({ paymentApproved, paymentCompletion }) => {
  const state = normalizePaymentState(paymentApproved)
  const hasSubmittedPayment = Number(paymentCompletion || 0) === 1

  if (state === 'approved') {
    return { className: 'terms-chip-paid', label: 'Paid' }
  }

  if (hasSubmittedPayment && state === 'pending') {
    return { className: 'terms-chip-waiting', label: 'Waiting for Approval' }
  }

  return { className: 'terms-chip-not-paid', label: 'Not Paid' }
}

const GatePassTermsReport = () => {
  const [search, setSearch] = useState('')
  const [students, setStudents] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchReport = async (queryValue = '') => {
    setLoading(true)
    setError('')

    try {
      const response = await cpanelApi.listGatePassTermsReport({
        search: queryValue,
        limit: 1000,
        offset: 0
      })

      const rows = Array.isArray(response?.students) ? response.students : []
      setStudents(rows)
      setTotal(Number(response?.total || rows.length || 0))
    } catch (fetchError) {
      setError(fetchError?.message || 'Unable to load gate pass terms report')
      setStudents([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchReport(search)
    }, 300)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [search])

  const summary = useMemo(() => {
    const approved = students.filter((row) => normalizePaymentState(row?.payment_approved) === 'approved').length
    const pending = students.filter((row) => normalizePaymentState(row?.payment_approved) === 'pending').length
    const declined = students.filter((row) => normalizePaymentState(row?.payment_approved) === 'declined').length

    return {
      approved,
      pending,
      declined
    }
  }, [students])

  return (
    <div className="gate-pass-terms-report">
      <div className="terms-summary-cards">
        <article className="terms-summary-card">
          <p className="terms-summary-label">Terms Accepted</p>
          <h3>{total}</h3>
        </article>
        <article className="terms-summary-card">
          <p className="terms-summary-label">Payment Approved</p>
          <h3>{summary.approved}</h3>
        </article>
        <article className="terms-summary-card">
          <p className="terms-summary-label">Pending or Declined</p>
          <h3>{summary.pending + summary.declined}</h3>
        </article>
      </div>

      <div className="terms-toolbar">
        <div className="terms-search-wrap">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code, name, email, department, year"
          />
        </div>
        <button
          type="button"
          className="terms-refresh-btn interactive"
          onClick={() => fetchReport(search)}
          disabled={loading}
        >
          {loading ? 'LOADING...' : 'REFRESH'}
        </button>
      </div>

      {error && <p className="terms-error">{error}</p>}

      <div className="terms-table-wrap">
        <table className="terms-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Department</th>
              <th>Year</th>
              <th>Terms Accepted At</th>
              <th>Payment</th>
            </tr>
          </thead>
          <tbody>
            {!loading && students.length === 0 && (
              <tr>
                <td colSpan="5" className="terms-empty">
                  No students found for this report.
                </td>
              </tr>
            )}

            {students.map((row) => {
              const paymentBadge = getPaymentBadge({
                paymentApproved: row?.payment_approved,
                paymentCompletion: row?.payment_completion
              })

              return (
                <tr key={String(row?.id || row?.student_code || Math.random())}>
                  <td>
                    <div className="terms-student">
                      <strong>{row?.name || '-'}</strong>
                      <span>{row?.student_code || '-'}</span>
                    </div>
                  </td>
                  <td>{row?.department || '-'}</td>
                  <td>{row?.year || '-'}</td>
                  <td>{formatAcceptedAt(row?.gate_pass_terms_accepted_at)}</td>
                  <td>
                    <span className={`terms-chip ${paymentBadge.className}`}>
                      {paymentBadge.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default GatePassTermsReport

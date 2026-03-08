import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { cpanelApi } from '../../lib/cpanelApi'
import './PaymentManagement.css'

const PAGE_SIZE = 20
const API_FETCH_BATCH_SIZE = 500
const MAX_PAYMENT_RECORDS = 3000

const formatFoodPreference = (value, foodIncluded = true) => {
  if (foodIncluded === false || value === null || value === 'null') return 'Food Not Included'
  if (!value) return 'N/A'

  const normalized = String(value).trim().toUpperCase()
  if (!normalized) return 'N/A'

  if (normalized === 'VEG' || normalized === 'VEGETARIAN') return 'Veg'
  if (normalized === 'NON-VEG' || normalized === 'NONVEG' || normalized === 'NON VEGETARIAN') return 'Non-Veg'

  return String(value).trim()
}

const resolveFoodIncluded = (payment) => {
  if (typeof payment?.foodIncluded === 'boolean') {
    return payment.foodIncluded
  }

  const rawPreference = payment?.foodPreference ?? payment?.paymentFoodPreference
  if (rawPreference === null || rawPreference === 'null') {
    return false
  }

  return true
}

const getPaymentApprovedStatus = (payment) => {
  const explicit = (payment?.payment_approved || payment?.paymentApproved || '').toString().trim().toLowerCase()
  if (explicit === 'approved' || explicit === 'declined' || explicit === 'pending') {
    return explicit
  }

  const normalizedStatus = (payment?.status || '').toString().trim().toLowerCase()
  if (normalizedStatus === 'completed') return 'approved'
  if (normalizedStatus === 'declined') return 'declined'
  return 'pending'
}

const normalizePayments = (records) => {
  if (!Array.isArray(records)) return []

  return records.map((payment, index) => {
    const foodIncluded = resolveFoodIncluded(payment)
    const rawFoodPreference = payment.foodPreference ?? payment.food_preference ?? payment.paymentFoodPreference ?? (foodIncluded ? localStorage.getItem('paymentFoodPreference') : null)

    // Build full screenshot URL from API response
    let screenshotUrl = payment.screenshot || payment.paymentScreenshot || null
    
    // If backend returned screenshot_path, it's already converted to full URL
    // Otherwise check localStorage for base64 data
    if (!screenshotUrl && payment.screenshot_path) {
      const apiBase = cpanelApi.baseUrl || 'https://api-refresko.skf.edu.in'
      screenshotUrl = apiBase + payment.screenshot_path
    }

    return {
      id: payment.payment_id || payment.id || `PAY${Date.now()}_${index + 1}`,
      paymentId: payment.payment_id || payment.id || `PAY${Date.now()}_${index + 1}`,
      utrNo: payment.utrNo || payment.utr_no || payment.paymentUTR || payment.transactionId || 'N/A',
      studentCode: payment.studentCode || payment.student_code || payment.studentId || 'N/A',
      studentName: payment.studentName || payment.student_name || payment.name || 'N/A',
      email: payment.email || 'N/A',
      college: payment.college || 'N/A',
      department: payment.department || 'N/A',
      year: payment.year || 'N/A',
      event: payment.event || 'Refresko 2026 Registration',
      foodPreference: formatFoodPreference(rawFoodPreference, foodIncluded),
      foodIncluded,
      amount: Number(payment.amount) || 600,
      status: payment.status || 'pending',
      paymentApproved: getPaymentApprovedStatus(payment),
      date: payment.date || payment.created_at || new Date().toISOString(),
      transactionId: payment.transactionId || payment.transaction_id || 'N/A',
      paymentMethod: payment.paymentMethod || payment.payment_method || 'UPI',
      screenshot: screenshotUrl,
      screenshotName: payment.screenshotName || payment.screenshot_name || payment.paymentScreenshotName || '',
      reviewedAt: payment.reviewedAt || payment.reviewed_at || ''
    }
  })
}

const csvEscape = (value) => {
  const stringValue = value === null || value === undefined ? '' : String(value)
  return `"${stringValue.replace(/"/g, '""')}"`
}

const toCsvContent = (records) => {
  const headers = [
    'Payment_ID',
    'UTR_No',
    'Student_Code',
    'Student_Name',
    'Email',
    'College',
    'Department',
    'Year',
    'Event',
    'Food_Preference',
    'Amount',
    'Payment_Status',
    'Payment_Approved',
    'Transaction_ID',
    'Payment_Method',
    'Date_Time',
    'Screenshot_Name',
    'Has_Screenshot',
    'Reviewed_At'
  ]

  const rows = records.map((payment) => {
    const line = [
      payment.id,
      payment.utrNo,
      payment.studentCode,
      payment.studentName,
      payment.email,
      payment.college,
      payment.department,
      payment.year,
      payment.event,
      payment.foodPreference,
      payment.amount,
      payment.status,
      payment.paymentApproved,
      payment.transactionId,
      payment.paymentMethod,
      payment.date,
      payment.screenshotName,
      Boolean(payment.screenshot || payment.screenshotName),
      payment.reviewedAt
    ]

    return line.map(csvEscape).join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}

const loadPaymentsFromLocalStorage = () => {
  try {
    const savedPayments = localStorage.getItem('paymentSubmissions')
    const parsedPayments = savedPayments ? JSON.parse(savedPayments) : []
    const normalized = normalizePayments(parsedPayments)

    if (normalized.length > 0) {
      return normalized
    }

    const legacyUtr = localStorage.getItem('paymentUTR')
    const legacyTxnId = localStorage.getItem('transactionId')
    const legacyStudentProfile = localStorage.getItem('studentProfile')

    if (!legacyUtr && !legacyTxnId) {
      return []
    }

    let parsedProfile = {}
    try {
      parsedProfile = legacyStudentProfile ? JSON.parse(legacyStudentProfile) : {}
    } catch {
      parsedProfile = {}
    }

    return normalizePayments([
      {
        id: `PAY${Date.now()}`,
        utrNo: legacyUtr || legacyTxnId || 'N/A',
        studentCode: parsedProfile.studentId || 'N/A',
        studentName: parsedProfile.name || 'N/A',
        email: parsedProfile.email || 'N/A',
        department: parsedProfile.department || 'N/A',
        year: parsedProfile.year || 'N/A',
        foodPreference: formatFoodPreference(
          localStorage.getItem('paymentFoodPreference') || localStorage.getItem('foodPreference')
        ),
        amount: 600,
        status: 'pending',
        date: new Date().toISOString(),
        transactionId: legacyTxnId || 'N/A',
        paymentMethod: 'UPI',
        screenshotName: localStorage.getItem('paymentScreenshotName') || ''
      }
    ])
  } catch {
    return []
  }
}

const loadPaymentsWithApi = async () => {
  if (cpanelApi.isConfigured()) {
    try {
      const allPayments = []
      let offset = 0
      let pageCount = 0
      const maxPages = Math.ceil(MAX_PAYMENT_RECORDS / API_FETCH_BATCH_SIZE)

      while (pageCount < maxPages) {
        const response = await cpanelApi.listPayments({
          limit: API_FETCH_BATCH_SIZE,
          offset
        })
        const chunk = Array.isArray(response?.payments) ? response.payments : []

        allPayments.push(...chunk)
        pageCount += 1

        if (allPayments.length >= MAX_PAYMENT_RECORDS) {
          break
        }

        const total = Number(response?.total)
        if (Number.isFinite(total) && allPayments.length >= Math.min(total, MAX_PAYMENT_RECORDS)) {
          break
        }

        if (response?.has_more !== true && chunk.length < API_FETCH_BATCH_SIZE) {
          break
        }

        if (chunk.length === 0) {
          break
        }

        offset += chunk.length
      }

      const normalized = normalizePayments(allPayments.slice(0, MAX_PAYMENT_RECORDS))

      console.log(`✅ Loaded ${normalized.length} payments from database`)
      return normalized
    } catch (error) {
      console.error('Failed to load payments from database:', error)
      return []
    }
  }

  console.warn('⚠️ cPanel API not configured - cannot load payments')
  return []
}

const PaymentManagement = () => {
  const [payments, setPayments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [selectedScreenshot, setSelectedScreenshot] = useState(null)

  useEffect(() => {
    const refreshPayments = async () => {
      const loaded = await loadPaymentsWithApi()
      setPayments(loaded)
    }

    refreshPayments()
  }, [])

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.studentCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.utrNo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || payment.status === filterStatus

    return matchesSearch && matchesStatus
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE))
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedPayments = filteredPayments.slice(pageStartIndex, pageStartIndex + PAGE_SIZE)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0)

  const pendingAmount = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0)

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment)
  }

  const handleUpdatePaymentStatus = async (paymentId, status) => {
    if (cpanelApi.isConfigured()) {
      try {
        // Find payment to get student_code before API call
        const targetPayment = payments.find(p => p.id === paymentId)
        const studentCode = (targetPayment?.studentCode || '').trim().toUpperCase()

        console.log('Updating payment:', {
          paymentId,
          status,
          studentCode,
          targetPayment: targetPayment ? {
            id: targetPayment.id,
            paymentId: targetPayment.paymentId,
            studentCode: targetPayment.studentCode
          } : null
        })

        // Update via cPanel API
        const apiResponse = await cpanelApi.updatePaymentDecision({ paymentId, decision: status })
        console.log('API Response:', apiResponse)

        // Sync student record if configured
        if (cpanelApi.isConfigured() && studentCode) {
          try {
            const studentUpdate = await cpanelApi.updateStudent({
              student_code: studentCode,
              payment_completion: status === 'declined' ? 0 : 1,
              gate_pass_created: status === 'approved' ? 1 : 0,
              payment_approved: status === 'approved' ? 'approved' : 'declined'
            })
            console.log('Student record synced successfully for:', studentCode, studentUpdate)
          } catch (updateError) {
            console.error('Unable to sync admin payment decision to database:', updateError)
          }
        }

        // Refresh payment list from API
        const refreshed = await loadPaymentsWithApi()
        setPayments(refreshed)

        // Update localStorage to reflect status change for student dashboard
        try {
          const savedPayments = localStorage.getItem('paymentSubmissions')
          const parsedPayments = savedPayments ? JSON.parse(savedPayments) : []
          const nextStatus = status === 'approved' ? 'completed' : 'declined'

          const updatedPayments = Array.isArray(parsedPayments)
            ? parsedPayments.map((payment) => {
                const currentPaymentId = payment.payment_id || payment.id || ''
                const currentStudentCode = (payment.studentCode || payment.student_code || '').trim().toUpperCase()
                
                // Match by payment_id or student_code
                if (currentPaymentId === paymentId || currentStudentCode === studentCode) {
                  return {
                    ...payment,
                    status: nextStatus,
                    payment_approved: status,
                    paymentApproved: status,
                    reviewedAt: new Date().toISOString()
                  }
                }
                return payment
              })
            : []

          if (updatedPayments.length > 0) {
            localStorage.setItem('paymentSubmissions', JSON.stringify(updatedPayments))
            window.dispatchEvent(new Event('paymentSubmissionsUpdated'))
          }
        } catch (localStorageError) {
          console.warn('Failed to update localStorage:', localStorageError)
        }

        // Update modal state
        setSelectedPayment((previous) => (
          previous && previous.id === paymentId
            ? {
                ...previous,
                status: status === 'approved' ? 'completed' : 'declined',
                paymentApproved: status
              }
            : previous
        ))
        return
      } catch (apiError) {
        console.warn('API payment decision update failed, using localStorage:', apiError)
      }
    }
    try {
      const savedPayments = localStorage.getItem('paymentSubmissions')
      const parsedPayments = savedPayments ? JSON.parse(savedPayments) : []
      const nextStatus = status === 'approved' ? 'completed' : status

      const updatedPayments = Array.isArray(parsedPayments)
        ? parsedPayments.map((payment) => {
            const currentId = payment.id || ''
            if (currentId !== paymentId) return payment

            return {
              ...payment,
              status: nextStatus,
              payment_approved: status === 'approved' ? 'approved' : 'declined',
              reviewedAt: new Date().toISOString()
            }
          })
        : []

      localStorage.setItem('paymentSubmissions', JSON.stringify(updatedPayments))
      window.dispatchEvent(new Event('paymentSubmissionsUpdated'))

      setPayments(normalizePayments(updatedPayments))
      const updatedPayment = updatedPayments.find((payment) => payment.id === paymentId)

      if (updatedPayment) {
        const updatedProfileRaw = localStorage.getItem('studentProfile')
        if (updatedProfileRaw) {
          try {
            const updatedProfile = JSON.parse(updatedProfileRaw)
            const sameStudent =
              updatedProfile.studentId === (updatedPayment.studentCode || updatedPayment.studentId) ||
              updatedProfile.email === updatedPayment.email

            if (sameStudent) {
              localStorage.setItem(
                'studentProfile',
                JSON.stringify({
                  ...updatedProfile,
                  payment_completion: status === 'declined' ? false : true,
                  gate_pass_created: status === 'approved',
                  payment_approved: status === 'approved' ? 'approved' : 'declined'
                })
              )
            }
          } catch {
            // ignore malformed profile cache
          }
        }

        if (cpanelApi.isConfigured()) {
          try {
            const studentCode = (updatedPayment.studentCode || updatedPayment.studentId || '').trim().toUpperCase()
            if (studentCode) {
              await cpanelApi.updateStudent({
                student_code: studentCode,
                payment_completion: status === 'declined' ? 0 : 1,
                gate_pass_created: status === 'approved' ? 1 : 0,
                payment_approved: status === 'approved' ? 'approved' : 'declined'
              })
            }
          } catch (error) {
            console.error('Unable to sync admin payment decision to database:', error)
          }
        }
      }

      setSelectedPayment((previous) => (
        previous && previous.id === paymentId
          ? {
              ...previous,
              status: nextStatus,
              paymentApproved: status === 'approved' ? 'approved' : 'declined'
            }
          : previous
      ))
    } catch {
      // ignore malformed localStorage payloads
    }
  }

  const handleDownloadReceipt = (payment) => {
    // Implement receipt download logic
    console.log('Downloading receipt for:', payment.id)
  }

  const getPaymentScreenshotSource = (payment) => {
    if (!payment) return ''

    if (typeof payment.screenshot === 'string' && payment.screenshot.trim()) {
      return payment.screenshot
    }

    const keys = [payment.utrNo, payment.transactionId, payment.id].filter(Boolean)
    for (const key of keys) {
      const storedScreenshot = localStorage.getItem(`paymentScreenshot:${key}`)
      if (storedScreenshot) {
        return storedScreenshot
      }
    }

    return ''
  }

  const handleViewUploadedImage = (payment) => {
    const screenshotSource = getPaymentScreenshotSource(payment)
    if (!screenshotSource) {
      window.alert('No uploaded payment screenshot found for this transaction.')
      return
    }

    setSelectedScreenshot({
      src: screenshotSource,
      name: payment?.screenshotName || 'Payment Screenshot',
      paymentId: payment?.id || ''
    })
  }

  const handleExportCsv = () => {
    if (payments.length === 0) {
      return
    }

    const csvContent = toCsvContent(payments)
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    link.href = url
    link.setAttribute('download', `payments_receipts_export_${timestamp}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="payment-management">
      {/* Summary Cards */}
      <div className="summary-cards">
        <motion.div
          className="summary-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="card-icon revenue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
          </div>
          <div className="card-content">
            <h3>Total Revenue</h3>
            <p className="card-value">₹{totalRevenue.toLocaleString()}</p>
            <span className="card-label">Completed Payments</span>
          </div>
        </motion.div>

        <motion.div
          className="summary-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="card-icon pending">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
          </div>
          <div className="card-content">
            <h3>Pending Amount</h3>
            <p className="card-value">₹{pendingAmount.toLocaleString()}</p>
            <span className="card-label">Awaiting Confirmation</span>
          </div>
        </motion.div>

        <motion.div
          className="summary-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="card-icon total">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/>
              <line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
          </div>
          <div className="card-content">
            <h3>Total Registrations</h3>
            <p className="card-value">{payments.length}</p>
            <span className="card-label">All Participants</span>
          </div>
        </motion.div>
      </div>

      {/* Filters and Search */}
      <motion.div
        className="payment-filters"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by transaction ID, student code, or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({payments.length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'completed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('completed')}
          >
            Completed ({payments.filter(p => p.status === 'completed').length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            Pending ({payments.filter(p => p.status === 'pending').length})
          </button>
          <button
            className="filter-btn export-csv-btn"
            onClick={handleExportCsv}
            disabled={payments.length === 0}
            title="Export all payment and receipt records to CSV"
          >
            Export CSV
          </button>
        </div>
      </motion.div>

      {/* Payment Table */}
      <motion.div
        className="payment-table-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <table className="payment-table">
          <thead>
            <tr>
              <th>UTR No.</th>
              <th>Student Code</th>
              <th>Student Name</th>
              <th>Department</th>
              <th>Year</th>
              <th>Amount</th>
              <th>Date &amp; Time</th>
              <th>Payment Approved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedPayments.map((payment, index) => (
              <motion.tr
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <td className="payment-id">{payment.utrNo}</td>
                <td>{payment.studentCode}</td>
                <td className="student-name">{payment.studentName}</td>
                <td>{payment.department}</td>
                <td>{payment.year}</td>
                <td className="amount">₹{payment.amount}</td>
                <td>{new Date(payment.date).toLocaleString()}</td>
                <td>
                  <span className={`status-badge ${payment.paymentApproved}`}>
                    {payment.paymentApproved}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="action-btn view"
                      onClick={() => handleViewReceipt(payment)}
                      title="View Receipt"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    </button>
                    <button
                      className="action-btn proof"
                      onClick={() => handleViewUploadedImage(payment)}
                      title="View Uploaded Image"
                      disabled={!getPaymentScreenshotSource(payment)}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </button>
                    <button
                      className="action-btn download"
                      onClick={() => handleDownloadReceipt(payment)}
                      title="Download Receipt"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>

        {filteredPayments.length > 0 && (
          <div className="payments-pagination">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages} • Showing {paginatedPayments.length} of {filteredPayments.length}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}

        {filteredPayments.length === 0 && (
          <div className="no-results">
            <p>No payments found matching your search criteria.</p>
          </div>
        )}
      </motion.div>

      {/* Receipt Modal */}
      {selectedPayment && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <motion.div
            className="receipt-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="receipt-header">
              <h2>Payment Receipt</h2>
              <button
                className="close-btn"
                onClick={() => setSelectedPayment(null)}
              >
                ×
              </button>
            </div>

            <div className="receipt-content">
              <div className="receipt-logo">
                <span className="logo-main">REFRESKO</span>
                <span className="logo-year">2026</span>
              </div>

              <div className="receipt-details">
                <div className="detail-row">
                  <span className="label">Payment ID:</span>
                  <span className="value">{selectedPayment.id}</span>
                </div>
                <div className="detail-row">
                  <span className="label">UTR No:</span>
                  <span className="value">{selectedPayment.utrNo}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Student Name:</span>
                  <span className="value">{selectedPayment.studentName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Email:</span>
                  <span className="value">{selectedPayment.email}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Food Preference:</span>
                  <span className="value">{formatFoodPreference(selectedPayment.foodPreference)}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Department:</span>
                  <span className="value">{selectedPayment.department}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Year:</span>
                  <span className="value">{selectedPayment.year}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Event:</span>
                  <span className="value">{selectedPayment.event}</span>
                </div>
                {selectedPayment.screenshot && (
                  <div className="detail-row">
                    <span className="label">Screenshot:</span>
                    <span className="value">{selectedPayment.screenshotName || 'Uploaded'}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">{new Date(selectedPayment.date).toLocaleString()}</span>
                </div>
                <div className="detail-row highlight">
                  <span className="label">Amount Paid:</span>
                  <span className="value amount-paid">₹{selectedPayment.amount}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Status:</span>
                  <span className={`status-badge ${selectedPayment.status}`}>
                    {selectedPayment.status}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Payment Approved:</span>
                  <span className={`status-badge ${selectedPayment.paymentApproved || getPaymentApprovedStatus(selectedPayment)}`}>
                    {selectedPayment.paymentApproved || getPaymentApprovedStatus(selectedPayment)}
                  </span>
                </div>
              </div>

              <div className="receipt-footer">
                <p>Thank you for participating in Refresko 2026!</p>
                <div className="receipt-admin-actions">
                  <button
                    className="receipt-action-btn approve"
                    onClick={() => handleUpdatePaymentStatus(selectedPayment.id, 'approved')}
                    disabled={selectedPayment.status === 'completed'}
                  >
                    Approve
                  </button>
                  <button
                    className="receipt-action-btn decline"
                    onClick={() => handleUpdatePaymentStatus(selectedPayment.id, 'declined')}
                    disabled={selectedPayment.status === 'declined'}
                  >
                    Decline
                  </button>
                </div>
                <button
                  className="download-receipt-btn"
                  onClick={() => handleDownloadReceipt(selectedPayment)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {selectedScreenshot && createPortal(
        <div className="modal-overlay" onClick={() => setSelectedScreenshot(null)}>
          <motion.div
            className="screenshot-modal"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="screenshot-modal-header">
              <h3>Uploaded Payment Image</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedScreenshot(null)}
              >
                ×
              </button>
            </div>
            <div className="screenshot-modal-content">
              <img src={selectedScreenshot.src} alt={selectedScreenshot.name} className="screenshot-preview-image" />
              <p className="screenshot-caption">
                {selectedScreenshot.name}
                {selectedScreenshot.paymentId ? ` • ${selectedScreenshot.paymentId}` : ''}
              </p>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default PaymentManagement

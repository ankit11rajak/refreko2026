import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { cpanelApi } from '../../lib/cpanelApi'
import './StudentManagement.css'

const PAGE_SIZE = 50

const isTrueFlag = (value) => {
  if (value === true || value === 1 || value === '1') return true
  const normalized = String(value ?? '').trim().toLowerCase()
  return normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

const normalizeApprovalStatus = (value) => {
  if (!value) return 'pending'
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'approved') return 'approved'
  if (normalized === 'declined') return 'declined'
  return 'pending'
}

const mapStudentRecord = (record) => ({
  id: record.student_code || record.id,
  name: record.name || 'N/A',
  email: record.email || 'N/A',
  phone: record.phone || 'N/A',
  college: 'Supreme Knowledge Foundation',
  department: record.department || 'N/A',
  year: record.year || 'N/A',
  rollNumber: record.student_code || 'N/A',
  registeredEvents: [],
  status: isTrueFlag(record.profile_completed) ? 'active' : 'inactive',
  paymentCompletion: isTrueFlag(record.payment_completion),
  gatePassCreated: isTrueFlag(record.gate_pass_created),
  paymentApproved: normalizeApprovalStatus(record.payment_approved),
  lastLogin: record.updated_at ? new Date(record.updated_at).toLocaleString() : 'N/A'
})

const StudentManagement = () => {
  const [students, setStudents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [formData, setFormData] = useState({})
  const deferredSearchTerm = useDeferredValue(searchTerm)

  useEffect(() => {
    const fetchStudents = async () => {
      if (!cpanelApi.isConfigured()) {
        setStudents([])
        return
      }

      try {
        const batchSize = 500
        let offset = 0
        let allRows = []
        const maxPages = 20

        for (let pageCount = 0; pageCount < maxPages; pageCount++) {
          const response = await cpanelApi.listStudents({ limit: batchSize, offset })
          const chunk = Array.isArray(response?.students) ? response.students : []

          if (chunk.length === 0) {
            break
          }

          allRows = allRows.concat(chunk)
          offset += chunk.length

          if (response?.has_more !== true || chunk.length < batchSize) {
            break
          }
        }

        setStudents(allRows.map(mapStudentRecord))
      } catch (error) {
        console.error('Failed to fetch students:', error)
        setStudents([])
      }
    }

    fetchStudents()
  }, [])

  const filteredStudents = useMemo(() => {
    const normalizedSearch = deferredSearchTerm.trim().toLowerCase()

    return students.filter((student) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        student.name.toLowerCase().includes(normalizedSearch) ||
        (student.email || '').toLowerCase().includes(normalizedSearch) ||
        student.id.toLowerCase().includes(normalizedSearch) ||
        (student.rollNumber || '').toLowerCase().includes(normalizedSearch)

      const matchesStatus = filterStatus === 'all' || student.status === filterStatus
      return matchesSearch && matchesStatus
    })
  }, [students, deferredSearchTerm, filterStatus])

  useEffect(() => {
    setCurrentPage(1)
  }, [deferredSearchTerm, filterStatus])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE))
  const pageStartIndex = (currentPage - 1) * PAGE_SIZE
  const paginatedStudents = filteredStudents.slice(pageStartIndex, pageStartIndex + PAGE_SIZE)

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleEditStudent = (student) => {
    setSelectedStudent(student)
    setFormData({
      name: student.name,
      email: student.email,
      phone: student.phone,
      department: student.department,
      year: student.year,
      rollNumber: student.rollNumber
    })
    setShowEditModal(true)
  }

  const handleViewDetails = (student) => {
    setSelectedStudent(student)
    setShowDetailsModal(true)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!cpanelApi.isConfigured()) {
      alert('Database connection not configured')
      return
    }

    try {
      // Map form data to cPanel API format
      const updateData = {
        student_code: selectedStudent.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        year: formData.year
      }

      // Update via cPanel API
      const response = await cpanelApi.updateStudent(updateData)

      if (!response?.success) {
        alert(`Update failed: ${response?.message || 'Unknown error'}`)
        return
      }

      // Update local state to reflect changes
      setStudents(students.map(student =>
        student.id === selectedStudent.id
          ? { 
              ...student, 
              name: formData.name,
              email: formData.email,
              phone: formData.phone,
              department: formData.department,
              year: formData.year
            }
          : student
      ))

      alert('Student details updated successfully!')
      setShowEditModal(false)
      setSelectedStudent(null)
    } catch (err) {
      console.error('Error updating student:', err)
      alert('Error updating student details. Please try again.')
    }
  }

  const handleToggleStatus = (studentId) => {
    setStudents(students.map(student =>
      student.id === studentId
        ? { ...student, status: student.status === 'active' ? 'inactive' : 'active' }
        : student
    ))
  }

  const handleResetPassword = (student) => {
    // In real implementation, this would send a password reset email
    alert(`Password reset link sent to ${student.email}`)
  }

  const handleDeleteStudent = (studentId) => {
    if (window.confirm('Are you sure you want to delete this student account? This action cannot be undone.')) {
      setStudents(students.filter(student => student.id !== studentId))
    }
  }

  return (
    <div className="student-management">
      {/* Header */}
      <div className="section-header">
        <div className="header-content">
          <h2>Student Account Management</h2>
          <p>Manage student login credentials and account details</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, ID, or roll number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="status-filters">
          <button
            className={`filter-btn ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            All ({students.length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'active' ? 'active' : ''}`}
            onClick={() => setFilterStatus('active')}
          >
            Active ({students.filter(s => s.status === 'active').length})
          </button>
          <button
            className={`filter-btn ${filterStatus === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilterStatus('inactive')}
          >
            Inactive ({students.filter(s => s.status === 'inactive').length})
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="students-table-container">
        <table className="students-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Year</th>
              <th>Profile</th>
              <th>Payment Completion</th>
              <th>Gate Pass Created</th>
              <th>Payment Approved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.map((student) => (
              <tr key={student.id}>
                <td className="student-id-cell">{student.id}</td>
                <td className="student-name-cell">{student.name}</td>
                <td>{student.email}</td>
                <td>{student.department}</td>
                <td>{student.year}</td>
                <td>
                  <span className={`status-badge ${student.status}`}>
                    {student.status}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${student.paymentCompletion ? 'flag-true' : 'flag-false'}`}>
                    {student.paymentCompletion ? 'True' : 'False'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${student.gatePassCreated ? 'flag-true' : 'flag-false'}`}>
                    {student.gatePassCreated ? 'True' : 'False'}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${student.paymentApproved}`}>
                    {student.paymentApproved}
                  </span>
                </td>
                <td>
                  <div className="student-actions compact">
                    <button
                      className="action-btn view"
                      onClick={() => handleViewDetails(student)}
                    >
                      View Full Details
                    </button>
                    <button
                      className="action-btn edit"
                      onClick={() => handleEditStudent(student)}
                    >
                      Edit
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredStudents.length > 0 && (
        <div className="students-pagination">
          <button
            className="pagination-btn"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages} • Showing {paginatedStudents.length} of {filteredStudents.length}
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

      {filteredStudents.length === 0 && (
        <div className="no-results">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <p>No students found</p>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedStudent && createPortal(
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <motion.div
            className="edit-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Student Full Details</h2>
              <button
                className="close-btn"
                onClick={() => setShowDetailsModal(false)}
              >
                ×
              </button>
            </div>

            <div className="edit-form">
              <div className="student-full-details">
                <div className="full-detail-row"><span>ID</span><strong>{selectedStudent.id}</strong></div>
                <div className="full-detail-row"><span>Name</span><strong>{selectedStudent.name}</strong></div>
                <div className="full-detail-row"><span>Email</span><strong>{selectedStudent.email}</strong></div>
                <div className="full-detail-row"><span>Phone</span><strong>{selectedStudent.phone}</strong></div>
                <div className="full-detail-row"><span>College</span><strong>{selectedStudent.college}</strong></div>
                <div className="full-detail-row"><span>Department</span><strong>{selectedStudent.department}</strong></div>
                <div className="full-detail-row"><span>Year</span><strong>{selectedStudent.year}</strong></div>
                <div className="full-detail-row"><span>Roll Number</span><strong>{selectedStudent.rollNumber}</strong></div>
                <div className="full-detail-row"><span>Registered Events</span><strong>{selectedStudent.registeredEvents.length}</strong></div>
                <div className="full-detail-row"><span>Last Login</span><strong>{selectedStudent.lastLogin}</strong></div>
                <div className="full-detail-row"><span>Status</span><strong>{selectedStudent.status}</strong></div>
                <div className="full-detail-row"><span>Payment Completion</span><strong>{selectedStudent.paymentCompletion ? 'True' : 'False'}</strong></div>
                <div className="full-detail-row"><span>Gate Pass Created</span><strong>{selectedStudent.gatePassCreated ? 'True' : 'False'}</strong></div>
                <div className="full-detail-row"><span>Payment Approved</span><strong>{selectedStudent.paymentApproved}</strong></div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowDetailsModal(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn-submit"
                  onClick={() => {
                    setShowDetailsModal(false)
                    handleEditStudent(selectedStudent)
                  }}
                >
                  Edit Student
                </button>
              </div>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {showEditModal && selectedStudent && createPortal(
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <motion.div
            className="edit-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Edit Student Details</h2>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>

            <form className="edit-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Full Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Phone *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Department *</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Civil">Civil</option>
                    <option value="Electrical">Electrical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Year *</label>
                  <select
                    name="year"
                    value={formData.year}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Roll Number *</label>
                <input
                  type="text"
                  name="rollNumber"
                  value={formData.rollNumber}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default StudentManagement

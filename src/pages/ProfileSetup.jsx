import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cpanelApi } from '../lib/cpanelApi'
import './ProfileSetup.css'

const ProfileSetup = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    studentId: '',
    email: '',
    department: '',
    year: '',
    phone: ''
  })
  const [errors, setErrors] = useState({})
  const [originalStudentCode, setOriginalStudentCode] = useState('')

  useEffect(() => {
    document.body.classList.add('system-cursor')
    
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    const verifyProfileCompletionFromDatabase = async () => {
      if (!cpanelApi.isConfigured()) return

      const loginStudentCode = localStorage.getItem('loginStudentCode')
      const prefilledProfileRawInner = localStorage.getItem('prefilledProfile')
      let prefilledStudentCode = ''

      if (prefilledProfileRawInner) {
        try {
          const prefilled = JSON.parse(prefilledProfileRawInner)
          prefilledStudentCode = String(prefilled?.studentId || '').trim().toUpperCase()
        } catch {
          prefilledStudentCode = ''
        }
      }

      const studentCode = String(loginStudentCode || prefilledStudentCode || '').trim().toUpperCase()
      if (!studentCode) return

      try {
        const response = await cpanelApi.getStudentByCode(studentCode)
        const dbCompleted = response?.success && response?.student?.profile_completed
          ? String(response.student.profile_completed) === '1' || response.student.profile_completed === true
          : false

        if (dbCompleted) {
          localStorage.setItem('profileCompleted', 'true')
          navigate('/dashboard')
        } else {
          localStorage.removeItem('profileCompleted')
        }
      } catch {
      }
    }

    verifyProfileCompletionFromDatabase()

    const prefilledProfileRaw = localStorage.getItem('prefilledProfile')
    const loginStudentCode = localStorage.getItem('loginStudentCode')
    if (prefilledProfileRaw) {
      try {
        const prefilledProfile = JSON.parse(prefilledProfileRaw)
        const prefilledDepartment = prefilledProfile.department || prefilledProfile.stream || ''
        const prefilledYear = prefilledProfile.year || ''

        setFormData((prev) => ({
          ...prev,
          name: prefilledProfile.name || prev.name,
          studentId: prefilledProfile.studentId || prev.studentId,
          email: prefilledProfile.email || prev.email,
          phone: prefilledProfile.phone || prev.phone,
          department: prefilledDepartment || prev.department,
          year: prefilledYear || prev.year
        }))
        setOriginalStudentCode(prefilledProfile.studentId || '')
      } catch {
        // Ignore parsing errors and continue with empty form
      }
    } else if (loginStudentCode) {
      setOriginalStudentCode(String(loginStudentCode).trim().toUpperCase())
    }

    const hydrateDepartmentFromDatabase = async () => {
      if (!cpanelApi.isConfigured()) return

      const prefilledProfileRawInner = localStorage.getItem('prefilledProfile')
      if (!prefilledProfileRawInner) return

      try {
        const prefilled = JSON.parse(prefilledProfileRawInner)
        const studentCode = prefilled.studentId
        if (!studentCode) return

        const response = await cpanelApi.getStudentByCode(studentCode)
        if (!response?.success || !response?.student) return

        const data = response.student
        setFormData((prev) => ({
          ...prev,
          department: data.department || prev.department,
          year: data.year || prev.year
        }))
      } catch {
        // Silent fail, user can still fill manually
      }
    }

    hydrateDepartmentFromDatabase()

    return () => {
      document.body.classList.remove('system-cursor')
    }
  }, [navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: ''
      })
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.studentId.trim()) {
      newErrors.studentId = 'Student ID is required'
    } else if (!/^[^\\\s]+(\\[^\\\s]+){3,}$/.test(formData.studentId.trim())) {
      newErrors.studentId = 'Student code must be in format like BTECH\\2022\\CSE\\0001'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required'
    }

    if (!formData.year) {
      newErrors.year = 'Year is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required'
    } else if (!/^[+]?[\d\s-]{10,15}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (validateForm()) {
      if (cpanelApi.isConfigured()) {
        const currentCode = formData.studentId.trim()

        const payload = {
          name: formData.name.trim(),
          student_code: currentCode.toUpperCase(),
          original_student_code: (originalStudentCode || currentCode).trim().toUpperCase(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.trim(),
          department: formData.department.trim(),
          year: formData.year,
          profile_completed: 1,
          payment_completion: 0,
          gate_pass_created: 0,
          payment_approved: 'pending',
          food_included: 0,
          food_preference: null
        }

        try {
          const response = await cpanelApi.updateStudent(payload)

          if (!response?.success) {
            setErrors((prev) => ({
              ...prev,
              studentId: 'Unable to update profile in database. Check student code or database policy.'
            }))
            return
          }
        } catch (error) {
          console.error('Profile update error:', error)
          setErrors((prev) => ({
            ...prev,
            studentId: 'Unable to update profile in database. Please try again.'
          }))
          return
        }
      }

      // Save profile data to localStorage
      localStorage.setItem('studentProfile', JSON.stringify(formData))
      localStorage.setItem('prefilledProfile', JSON.stringify(formData))
      localStorage.setItem('loginStudentCode', formData.studentId.trim().toUpperCase())
      localStorage.setItem('profileCompleted', 'true')
      
      // Redirect to dashboard
      navigate('/dashboard')
    }
  }

  return (
    <div className="profile-setup-page">
      <div className="hex-grid-overlay" />

      <motion.div
        className="profile-setup-container"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="profile-header">
          <motion.div
            className="profile-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="setup-icon">👤</div>
          </motion.div>

          <motion.h1
            className="profile-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            COMPLETE YOUR PROFILE
          </motion.h1>

          <motion.p
            className="profile-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            Please fill in your details to access your SKF dashboard
          </motion.p>

          <motion.div
            className="progress-indicator"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <div className="progress-step active">
              <span className="step-number">1</span>
              <span className="step-label">Login</span>
            </div>
            <div className="progress-line active"></div>
            <div className="progress-step active">
              <span className="step-number">2</span>
              <span className="step-label">Profile</span>
            </div>
            <div className="progress-line"></div>
            <div className="progress-step">
              <span className="step-number">3</span>
              <span className="step-label">Dashboard</span>
            </div>
          </motion.div>
        </div>

        <motion.form
          className="profile-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`form-input ${errors.name ? 'error' : ''}`}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="studentId">Student ID / Roll No *</label>
              <input
                type="text"
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleChange}
                placeholder="BTECH\2022\CSE\0001"
                className={`form-input ${errors.studentId ? 'error' : ''}`}
              />
              {errors.studentId && <span className="error-message">{errors.studentId}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">SKF Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your.name@skf.edu"
                className={`form-input ${errors.email ? 'error' : ''}`}
              />
              {errors.email && <span className="error-message">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className={`form-input ${errors.phone ? 'error' : ''}`}
              />
              {errors.phone && <span className="error-message">{errors.phone}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="department">Department *</label>
              <input
                type="text"
                id="department"
                name="department"
                value={formData.department}
                onChange={handleChange}
                placeholder="Enter department"
                className={`form-input ${errors.department ? 'error' : ''}`}
              />
              {errors.department && <span className="error-message">{errors.department}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="year">Year *</label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className={`form-input ${errors.year ? 'error' : ''}`}
              >
                <option value="">Select Year</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
              {errors.year && <span className="error-message">{errors.year}</span>}
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="submit-btn">
              <span>SAVE & CONTINUE TO DASHBOARD</span>
            </button>
          </div>
        </motion.form>

        <motion.div
          className="profile-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
        >
          <p className="footer-note">
            All fields marked with * are required
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default ProfileSetup

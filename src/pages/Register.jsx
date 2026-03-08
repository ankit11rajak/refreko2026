import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import './Register.css'

const Register = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    college: '',
    events: [],
    password: '',
    confirmPassword: ''
  })

  useEffect(() => {
    document.body.classList.add('system-cursor')

    return () => {
      document.body.classList.remove('system-cursor')
    }
  }, [])

  const availableEvents = [
    'Coding Competition',
    'Design Challenge',
    'Cultural Performance',
    'Dance Competition',
    'Music Battle',
    'Gaming Tournament',
    'Tech Quiz',
    'Robo Wars'
  ]

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleEventToggle = (event) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event]
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle registration logic here
    console.log('Registration attempt:', formData)
  }

  return (
    <div className="auth-page register-page">
      <div className="hex-grid-overlay" />
      
      <Link to="/" className="back-home">
        <span>← Back to Home</span>
      </Link>

      <motion.div
        className="auth-container register-container"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="auth-header">
          <motion.div
            className="auth-icon"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="register-icon">🎯</div>
          </motion.div>
          
          <motion.h1
            className="auth-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            EVENT REGISTRATION
          </motion.h1>
          
          <motion.p
            className="auth-subtitle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            Join REFRESKO 2026 - Register for exciting events and competitions
          </motion.p>
        </div>

        <motion.form
          className="auth-form register-form"
          onSubmit={handleSubmit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="fullName">Full Name *</label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="phone">Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 XXXXX XXXXX"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="your.email@example.com"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="college">College/Institution *</label>
            <input
              type="text"
              id="college"
              name="college"
              value={formData.college}
              onChange={handleChange}
              placeholder="Enter your college name"
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label>Select Events to Participate *</label>
            <div className="events-grid">
              {availableEvents.map((event) => (
                <div
                  key={event}
                  className={`event-card ${formData.events.includes(event) ? 'selected' : ''}`}
                  onClick={() => handleEventToggle(event)}
                >
                  <span className="event-check">
                    {formData.events.includes(event) ? '✓' : '+'}
                  </span>
                  <span className="event-name">{event}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Create Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                className="form-input"
              />
            </div>
          </div>

          <div className="terms-group">
            <label className="checkbox-label">
              <input type="checkbox" required />
              <span>I agree to the Terms & Conditions and Privacy Policy</span>
            </label>
          </div>

          <button type="submit" className="auth-btn">
            <span>REGISTER NOW</span>
          </button>
        </motion.form>

        <motion.div
          className="auth-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.1 }}
        >
          <p className="auth-divider">
            <span>Already registered or an SKF student?</span>
          </p>
          <Link to="/login" className="switch-link">
            Login to your account →
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Register

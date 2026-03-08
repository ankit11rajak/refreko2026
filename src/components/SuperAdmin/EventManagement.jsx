import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import './EventManagement.css'

// Sample events data
const sampleEvents = [
  {
    id: 'EVT001',
    name: 'Coding Competition',
    category: 'Technical',
    description: '48-hour hackathon to build innovative solutions',
    baseAmount: 500,
    teamSize: 4,
    venue: 'Lab A-301',
    date: '2026-03-27',
    time: '09:00 AM',
    maxParticipants: 100,
    currentRegistrations: 42,
    prizes: '₹50,000',
    status: 'active'
  },
  {
    id: 'EVT002',
    name: 'Robo Wars',
    category: 'Technical',
    description: 'Combat robotics championship with custom bots',
    baseAmount: 1000,
    teamSize: 5,
    venue: 'Sports Arena',
    date: '2026-03-28',
    time: '10:00 AM',
    maxParticipants: 50,
    currentRegistrations: 28,
    prizes: '₹1,00,000',
    status: 'active'
  }
]

const EventManagement = () => {
  const [events, setEvents] = useState(sampleEvents)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    category: 'Technical',
    description: '',
    baseAmount: '',
    teamSize: 1,
    venue: '',
    date: '',
    time: '',
    maxParticipants: '',
    prizes: '',
    status: 'active'
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleAddEvent = () => {
    setEditingEvent(null)
    setFormData({
      name: '',
      category: 'Technical',
      description: '',
      baseAmount: '',
      teamSize: 1,
      venue: '',
      date: '',
      time: '',
      maxParticipants: '',
      prizes: '',
      status: 'active'
    })
    setShowAddModal(true)
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event)
    setFormData(event)
    setShowAddModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (editingEvent) {
      // Update existing event
      setEvents(events.map(evt => 
        evt.id === editingEvent.id ? { ...formData, id: evt.id, currentRegistrations: evt.currentRegistrations } : evt
      ))
    } else {
      // Add new event
      const newEvent = {
        ...formData,
        id: `EVT${String(events.length + 1).padStart(3, '0')}`,
        currentRegistrations: 0
      }
      setEvents([...events, newEvent])
    }
    
    setShowAddModal(false)
    setEditingEvent(null)
  }

  const handleDeleteEvent = (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      setEvents(events.filter(evt => evt.id !== eventId))
    }
  }

  const handleToggleStatus = (eventId) => {
    setEvents(events.map(evt => 
      evt.id === eventId 
        ? { ...evt, status: evt.status === 'active' ? 'inactive' : 'active' }
        : evt
    ))
  }

  return (
    <div className="event-management">
      {/* Header */}
      <div className="section-header">
        <div className="header-content">
          <h2>Event Management</h2>
          <p>Create and manage events for Refresko 2026</p>
        </div>
        <button className="add-btn interactive" onClick={handleAddEvent}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add New Event
        </button>
      </div>

      {/* Stats */}
      <div className="event-stats">
        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Events</h3>
            <p>{events.length}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="stat-icon active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Active Events</h3>
            <p>{events.filter(e => e.status === 'active').length}</p>
          </div>
        </motion.div>

        <motion.div
          className="stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="stat-icon registrations">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="stat-content">
            <h3>Total Registrations</h3>
            <p>{events.reduce((sum, e) => sum + e.currentRegistrations, 0)}</p>
          </div>
        </motion.div>
      </div>

      {/* Events Grid */}
      <div className="events-grid">
        {events.map((event, index) => (
          <motion.div
            key={event.id}
            className={`event-card ${event.status}`}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <div className="event-card-header">
              <div className="event-badge">{event.category}</div>
              <span className={`status-indicator ${event.status}`}>
                {event.status}
              </span>
            </div>

            <h3 className="event-name">{event.name}</h3>
            <p className="event-description">{event.description}</p>

            <div className="event-details">
              <div className="detail-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23"/>
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
                <span>₹{event.baseAmount}</span>
              </div>
              <div className="detail-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                </svg>
                <span>Team: {event.teamSize}</span>
              </div>
              <div className="detail-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span>{event.date}</span>
              </div>
              <div className="detail-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{event.venue}</span>
              </div>
            </div>

            <div className="event-registration">
              <div className="registration-bar">
                <div 
                  className="registration-fill"
                  style={{ width: `${(event.currentRegistrations / event.maxParticipants) * 100}%` }}
                />
              </div>
              <span className="registration-text">
                {event.currentRegistrations} / {event.maxParticipants} registered
              </span>
            </div>

            <div className="event-actions">
              <button 
                className="action-btn edit"
                onClick={() => handleEditEvent(event)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
                Edit
              </button>
              <button 
                className="action-btn toggle"
                onClick={() => handleToggleStatus(event.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="1" y="5" width="22" height="14" rx="7" ry="7"/>
                  <circle cx={event.status === 'active' ? '16' : '8'} cy="12" r="3"/>
                </svg>
                {event.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button 
                className="action-btn delete"
                onClick={() => handleDeleteEvent(event.id)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
                Delete
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && createPortal(
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <motion.div
            className="event-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{editingEvent ? 'Edit Event' : 'Add New Event'}</h2>
              <button
                className="close-btn"
                onClick={() => setShowAddModal(false)}
              >
                ×
              </button>
            </div>

            <form className="event-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Event Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="Technical">Technical</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Workshop">Workshop</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Base Amount (₹) *</label>
                  <input
                    type="number"
                    name="baseAmount"
                    value={formData.baseAmount}
                    onChange={handleInputChange}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Team Size *</label>
                  <input
                    type="number"
                    name="teamSize"
                    value={formData.teamSize}
                    onChange={handleInputChange}
                    required
                    min="1"
                  />
                </div>
                <div className="form-group">
                  <label>Max Participants *</label>
                  <input
                    type="number"
                    name="maxParticipants"
                    value={formData.maxParticipants}
                    onChange={handleInputChange}
                    required
                    min="1"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Venue *</label>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Time *</label>
                  <input
                    type="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Prize Money</label>
                <input
                  type="text"
                  name="prizes"
                  value={formData.prizes}
                  onChange={handleInputChange}
                  placeholder="e.g., ₹50,000"
                />
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  {editingEvent ? 'Update Event' : 'Create Event'}
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

export default EventManagement

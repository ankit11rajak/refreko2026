import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrowserQRCodeReader } from '@zxing/browser'
import jsQR from 'jsqr'
import { cpanelApi } from '../lib/cpanelApi'
import './GateVolunteerPortal.css'

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

const GateVolunteerPortal = () => {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const scanLoopRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const scanCanvasRef = useRef(null)
  const isDecodingRef = useRef(false)
  const zxingReaderRef = useRef(null)
  const zxingControlsRef = useRef(null)

  const token = localStorage.getItem('staffToken') || ''
  const staffRole = (localStorage.getItem('staffRole') || '').toLowerCase()
  const staffName = localStorage.getItem('staffName') || localStorage.getItem('staffUsername') || 'Volunteer'

  const [isLoading, setIsLoading] = useState(true)
  const [portalError, setPortalError] = useState('')

  const [entryDate, setEntryDate] = useState(todayIsoDate())
  const [records, setRecords] = useState([])
  const [activeTab, setActiveTab] = useState('scan')

  const [searchText, setSearchText] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])

  const [manualStudentCode, setManualStudentCode] = useState('')
  const [qrInput, setQrInput] = useState('')
  const [entryMessage, setEntryMessage] = useState('')
  const [entryError, setEntryError] = useState('')
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false)

  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [resolvedStudent, setResolvedStudent] = useState(null)

  const canUseBarcodeDetector = useMemo(
    () => typeof window !== 'undefined' && 'BarcodeDetector' in window,
    []
  )

  const clearSession = () => {
    localStorage.removeItem('staffAuthenticated')
    localStorage.removeItem('staffToken')
    localStorage.removeItem('staffRole')
    localStorage.removeItem('staffName')
    localStorage.removeItem('staffUsername')
  }

  const stopScanner = () => {
    if (zxingControlsRef.current) {
      try {
        zxingControlsRef.current.stop()
      } catch {
        // ignore cleanup errors
      }
      zxingControlsRef.current = null
    }

    if (scanLoopRef.current) {
      clearInterval(scanLoopRef.current)
      scanLoopRef.current = null
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    setScannerEnabled(false)
  }

  const loadRecords = async (dateValue) => {
    const response = await cpanelApi.gateVolunteerListEntries({
      token,
      entryDate: dateValue,
      limit: 200
    })
    setRecords(Array.isArray(response?.records) ? response.records : [])
  }

  const resolveDetectedStudent = async ({ qrData, studentCode, autoGrant = false }) => {
    try {
      const response = await cpanelApi.gateVolunteerResolveStudent({
        token,
        qrData,
        studentCode
      })

      const student = response?.student || null
      setResolvedStudent(student ? {
        ...student,
        entered_today: Boolean(response?.entered_today),
        today_entry: response?.today_entry || null
      } : null)

      if (student?.student_code) {
        setManualStudentCode(String(student.student_code))
      }

      if (response?.entered_today) {
        setEntryError('Student already entered today')
      } else if (student?.eligible) {
        setEntryMessage('Student record found in DB and eligible for entry.')
        if (autoGrant && !isSubmittingEntry) {
          await grantEntry({
            studentCode: String(student.student_code || studentCode || '').toUpperCase(),
            qrData: String(qrData || ''),
            method: 'qr'
          })
          return
        }
      } else {
        setEntryError(student?.ineligible_reason || 'Student is not eligible for entry')
      }
    } catch (error) {
      setResolvedStudent(null)
      setEntryError(error?.message || 'Unable to find student record from scanned QR')
    }
  }

  const boot = async () => {
    if (!token || localStorage.getItem('staffAuthenticated') !== 'true') {
      navigate('/login/staff')
      return
    }

    if (staffRole !== 'volunteer') {
      navigate('/staff-portal')
      return
    }

    setIsLoading(true)
    setPortalError('')

    try {
      await loadRecords(entryDate)
    } catch (error) {
      setPortalError(error?.message || 'Unable to load gate records')
      if (error?.status === 401) {
        clearSession()
        navigate('/login/staff')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    document.body.classList.add('system-cursor')
    boot()

    return () => {
      document.body.classList.remove('system-cursor')
      stopScanner()
    }
  }, [navigate])

  const startScanner = async () => {
    setScannerError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      })

      mediaStreamRef.current = stream
      const [track] = stream.getVideoTracks()
      if (track?.applyConstraints) {
        try {
          await track.applyConstraints({
            advanced: [
              { focusMode: 'continuous' },
              { exposureMode: 'continuous' },
            ]
          })
        } catch {
          // Ignore unsupported advanced constraints.
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        if (videoRef.current.paused) {
          await videoRef.current.play()
        }
      }

      if (!zxingReaderRef.current) {
        zxingReaderRef.current = new BrowserQRCodeReader()
      }

      const detector = canUseBarcodeDetector
        ? new window.BarcodeDetector({ formats: ['qr_code'] })
        : null
      setScannerEnabled(true)

      if (zxingReaderRef.current && videoRef.current) {
        try {
          zxingControlsRef.current = await zxingReaderRef.current.decodeFromVideoElement(
            videoRef.current,
            (result) => {
              const scannedRaw = String(result?.getText?.() || '').trim()
              if (!scannedRaw) {
                return
              }

              setQrInput(scannedRaw)
              setEntryMessage('QR captured. Checking student record in DB...')
              setEntryError('')
              resolveDetectedStudent({ qrData: scannedRaw, studentCode: '', autoGrant: true })
              stopScanner()
            }
          )
          return
        } catch {
          // Fall through to existing detector/jsQR loop.
        }
      }

      scanLoopRef.current = setInterval(async () => {
        try {
          if (!videoRef.current || isDecodingRef.current) return
          isDecodingRef.current = true
          let scannedRaw = ''

          if (detector) {
            const barcodes = await detector.detect(videoRef.current)
            if (Array.isArray(barcodes) && barcodes[0]?.rawValue) {
              scannedRaw = String(barcodes[0].rawValue).trim()
            }
          } else {
            const video = videoRef.current
            const canvas = scanCanvasRef.current || document.createElement('canvas')
            scanCanvasRef.current = canvas

            const width = video.videoWidth || 0
            const height = video.videoHeight || 0
            if (width > 0 && height > 0) {
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d', { willReadFrequently: true })
              if (ctx) {
                ctx.drawImage(video, 0, 0, width, height)
                const imageData = ctx.getImageData(0, 0, width, height)
                const code = jsQR(imageData.data, width, height, {
                  inversionAttempts: 'attemptBoth'
                })
                if (code?.data) {
                  scannedRaw = String(code.data).trim()
                }
              }
            }
          }

          if (scannedRaw) {
            setQrInput(scannedRaw)
            setEntryMessage('QR captured. Checking student record in DB...')
            setEntryError('')
            await resolveDetectedStudent({ qrData: scannedRaw, studentCode: '', autoGrant: true })
            stopScanner()
          }
        } catch {
          // Keep scanning loop running.
        } finally {
          isDecodingRef.current = false
        }
      }, 300)
    } catch (error) {
      setScannerError(error?.message || 'Camera access denied or unavailable')
      stopScanner()
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()
    const query = String(searchText || '').trim()
    setSearchResults([])

    if (query.length < 2) {
      return
    }

    setSearchLoading(true)
    setEntryError('')
    setEntryMessage('')

    try {
      const response = await cpanelApi.gateVolunteerSearchStudents({ token, query })
      setSearchResults(Array.isArray(response?.students) ? response.students : [])
    } catch (error) {
      setEntryError(error?.message || 'Student search failed')
    } finally {
      setSearchLoading(false)
    }
  }

  const grantEntry = async ({ studentCode, qrData, method }) => {
    setIsSubmittingEntry(true)
    setEntryError('')
    setEntryMessage('')

    try {
      const response = await cpanelApi.gateVolunteerMarkEntry({
        token,
        studentCode,
        qrData,
        entryMethod: method
      })

      setEntryMessage(response?.message || 'Entry granted')
      setManualStudentCode('')
      setQrInput('')
      setSearchText('')
      setSearchResults([])
      setResolvedStudent(null)
      await loadRecords(entryDate)
    } catch (error) {
      setEntryError(error?.message || 'Unable to grant entry')
      if (error?.status === 401) {
        clearSession()
        navigate('/login/staff')
      }
    } finally {
      setIsSubmittingEntry(false)
    }
  }

  const handleManualEntry = async (e) => {
    e.preventDefault()

    const code = String(manualStudentCode || '').trim().toUpperCase()
    const qrData = String(qrInput || '').trim()

    if (!code && !qrData) {
      setEntryError('Enter student code or QR payload')
      return
    }

    await grantEntry({
      studentCode: code,
      qrData,
      method: qrData ? 'qr' : 'manual'
    })
  }

  if (isLoading) {
    return <div className="gate-volunteer-page"><div className="gate-card">Loading gate volunteer portal...</div></div>
  }

  return (
    <div className="gate-volunteer-page">
      <div className="hex-grid-overlay" />

      <div className="gate-shell">
        <header className="gate-header gate-card">
          <div>
            <h1>Gate Volunteer Portal</h1>
            <p>{staffName} · VOLUNTEER</p>
          </div>
          <div className="gate-header-actions">
            <button type="button" className="gate-btn" onClick={() => loadRecords(entryDate)}>Refresh Records</button>
            <Link to="/staff-portal" className="gate-link-btn">Staff Portal</Link>
            <Link to="/" className="gate-link-btn">Home</Link>
          </div>
        </header>

        <section className="gate-card">
          <div className="gate-tabs">
            <button
              type="button"
              className={`gate-tab-btn ${activeTab === 'scan' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('scan')}
            >
              Scan QR
            </button>
            <button
              type="button"
              className={`gate-tab-btn ${activeTab === 'search' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              Search Student
            </button>
            <button
              type="button"
              className={`gate-tab-btn ${activeTab === 'records' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('records')}
            >
              View Records
            </button>
          </div>
        </section>

        {portalError ? <div className="gate-alert gate-alert-error">{portalError}</div> : null}

        {activeTab === 'scan' ? (
        <section className="gate-card">
          <h2>Scan Or Enter QR</h2>
          <p>Entry is granted only for students with paid and approved contribution. One QR is valid once per day.</p>

          <div className="scanner-actions">
            <button type="button" className="gate-btn" onClick={startScanner} disabled={scannerEnabled}>Start Camera Scan</button>
            <button type="button" className="gate-btn gate-btn-muted" onClick={stopScanner} disabled={!scannerEnabled}>Stop Camera</button>
          </div>

          <video ref={videoRef} className="scanner-preview" autoPlay muted playsInline />
          {scannerError ? <div className="gate-alert gate-alert-error">{scannerError}</div> : null}

          <form onSubmit={handleManualEntry} className="manual-entry-form">
            <label>
              Student Code
              <input
                id="gate-student-code"
                name="studentCode"
                value={manualStudentCode}
                onChange={(e) => setManualStudentCode(e.target.value)}
                placeholder="SKFGI\\2024\\BCA\\0032"
              />
            </label>

            <label>
              QR Payload (Manual Paste)
              <textarea
                id="gate-qr-payload"
                name="qrPayload"
                rows={4}
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder='Paste scanner output or QR JSON payload'
              />
            </label>

            <button type="submit" className="gate-btn" disabled={isSubmittingEntry}>
              {isSubmittingEntry ? 'Checking...' : 'Grant Entry'}
            </button>
          </form>

          {resolvedStudent ? (
            <div className="search-item" style={{ marginTop: '10px' }}>
              <div>
                <strong>{resolvedStudent.name}</strong>
                <p>{resolvedStudent.student_code} · {resolvedStudent.department || '-'} · {resolvedStudent.year || '-'}</p>
                {resolvedStudent.eligible ? <p>Eligible: Yes</p> : <p className="danger-text">{resolvedStudent.ineligible_reason || 'Not eligible'}</p>}
                {resolvedStudent.entered_today ? <p className="warn-text">Already entered today</p> : null}
              </div>
            </div>
          ) : null}

          {entryMessage ? <div className="gate-alert gate-alert-success">{entryMessage}</div> : null}
          {entryError ? <div className="gate-alert gate-alert-error">{entryError}</div> : null}
        </section>
        ) : null}

        {activeTab === 'search' ? (
        <section className="gate-card">
          <h2>Search Student By Name Or Code</h2>
          <form onSubmit={handleSearch} className="search-form">
            <input
              id="gate-student-search"
              name="searchQuery"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Enter student name or code"
            />
            <button type="submit" className="gate-btn" disabled={searchLoading}>
              {searchLoading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <div className="search-list">
            {searchResults.map((student) => (
              <div key={student.student_code} className="search-item">
                <div>
                  <strong>{student.name}</strong>
                  <p>{student.student_code} · {student.department || '-'} · {student.year || '-'}</p>
                  {!student.eligible ? <p className="danger-text">{student.ineligible_reason || 'Not eligible'}</p> : null}
                  {student.entered_today ? <p className="warn-text">Already entered today</p> : null}
                </div>
                <button
                  type="button"
                  className="gate-btn"
                  disabled={!student.eligible || student.entered_today || isSubmittingEntry}
                  onClick={() => grantEntry({ studentCode: student.student_code, qrData: '', method: 'search' })}
                >
                  Grant Entry
                </button>
              </div>
            ))}
          </div>
        </section>
        ) : null}

        {activeTab === 'records' ? (
        <section className="gate-card">
          <h2>Entry Records</h2>
          <div className="records-toolbar">
            <label>
              Date
              <input
                id="gate-entry-date"
                name="entryDate"
                type="date"
                value={entryDate}
                onChange={async (e) => {
                  const nextDate = e.target.value
                  setEntryDate(nextDate)
                  await loadRecords(nextDate)
                }}
              />
            </label>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Code</th>
                  <th>Method</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-row">No entries found for selected date</td>
                  </tr>
                ) : records.map((record) => (
                  <tr key={record.id}>
                    <td>{record.entry_at}</td>
                    <td>{record.student_name}</td>
                    <td>{record.student_code}</td>
                    <td>{record.entry_method}</td>
                    <td>{record.entry_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        ) : null}
      </div>
    </div>
  )
}

export default GateVolunteerPortal

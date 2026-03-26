import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BrowserQRCodeReader } from '@zxing/browser'
import jsQR from 'jsqr'
import { cpanelApi } from '../lib/cpanelApi'
import GateEntryLabel from '../components/Gate/GateEntryLabel'
import './GateVolunteerPortal.css'

const todayIsoDate = () => new Date().toISOString().slice(0, 10)

const formatPaymentStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'paid' ? 'PAID' : 'NOT PAID'
}

const GateVolunteerPortal = () => {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const scanLoopRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const scanCanvasRef = useRef(null)
  const isDecodingRef = useRef(false)
  const isScanProcessingRef = useRef(false)
  const zxingReaderRef = useRef(null)
  const zxingControlsRef = useRef(null)
  const uploadInputRef = useRef(null)

  const token = localStorage.getItem('staffToken') || ''
  const staffRole = (localStorage.getItem('staffRole') || '').toLowerCase()
  const staffName = localStorage.getItem('staffName') || localStorage.getItem('staffUsername') || 'Volunteer'

  const [isLoading, setIsLoading] = useState(true)
  const [portalError, setPortalError] = useState('')

  const [entryDate, setEntryDate] = useState(todayIsoDate())
  const [records, setRecords] = useState([])
  const [activeTab, setActiveTab] = useState('scan')

  const [searchText, setSearchText] = useState('')
  const [searchDepartmentFilter, setSearchDepartmentFilter] = useState('all')
  const [searchYearFilter, setSearchYearFilter] = useState('all')
  const [searchLoading, setSearchLoading] = useState(false)
  const [studentDirectory, setStudentDirectory] = useState([])

  const [manualStudentCode, setManualStudentCode] = useState('')
  const [qrInput, setQrInput] = useState('')
  const [entryMessage, setEntryMessage] = useState('')
  const [entryError, setEntryError] = useState('')
  const [isSubmittingEntry, setIsSubmittingEntry] = useState(false)

  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [cameraFacingMode, setCameraFacingMode] = useState('environment')
  const [cameraSwitching, setCameraSwitching] = useState(false)
  const [scannerError, setScannerError] = useState('')
  const [imageScanLoading, setImageScanLoading] = useState(false)
  const [imageScanError, setImageScanError] = useState('')
  const [resolvedStudent, setResolvedStudent] = useState(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [recordDepartmentFilter, setRecordDepartmentFilter] = useState('all')
  const [recordYearFilter, setRecordYearFilter] = useState('all')
  const [showEntryLabel, setShowEntryLabel] = useState(false)
  const [lastEntry, setLastEntry] = useState(null)

  const searchDepartmentOptions = useMemo(() => {
    const values = Array.from(new Set(
      studentDirectory
        .map((student) => String(student?.department || '').trim())
        .filter(Boolean)
    ))
    return values.sort((a, b) => a.localeCompare(b))
  }, [studentDirectory])

  const searchYearOptions = useMemo(() => {
    const values = Array.from(new Set(
      studentDirectory
        .map((student) => String(student?.year || '').trim())
        .filter(Boolean)
    ))
    return values.sort((a, b) => a.localeCompare(b))
  }, [studentDirectory])

  const activeTabHint = useMemo(() => {
    if (activeTab === 'scan') return 'Scan from camera, photo, or paste QR payload'
    if (activeTab === 'search') return 'All students are loaded below. Search and grant entry quickly.'
    return 'Review all gate entries for selected date'
  }, [activeTab])

  const filteredSearchResults = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase()
    return studentDirectory.filter((student) => {
      const code = String(student?.student_code || '').toLowerCase()
      const name = String(student?.name || '').toLowerCase()
      const department = String(student?.department || '').toLowerCase()
      const year = String(student?.year || '').toLowerCase()

      const matchesQuery = !query
        || code.includes(query)
        || name.includes(query)
        || department.includes(query)
        || year.includes(query)

      const matchesDepartment = searchDepartmentFilter === 'all'
        || String(student?.department || '').trim() === searchDepartmentFilter

      const matchesYear = searchYearFilter === 'all'
        || String(student?.year || '').trim() === searchYearFilter

      return matchesQuery && matchesDepartment && matchesYear
    })
  }, [studentDirectory, searchText, searchDepartmentFilter, searchYearFilter])

  const recordDepartmentOptions = useMemo(() => {
    const values = Array.from(new Set(
      studentDirectory
        .map((student) => String(student?.department || '').trim())
        .filter(Boolean)
    ))
    return values.sort((a, b) => a.localeCompare(b))
  }, [studentDirectory])

  const recordYearOptions = useMemo(() => {
    const values = Array.from(new Set(
      studentDirectory
        .map((student) => String(student?.year || '').trim())
        .filter(Boolean)
    ))
    return values.sort((a, b) => a.localeCompare(b))
  }, [studentDirectory])

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const matchesDepartment = recordDepartmentFilter === 'all'
        || String(record?.student_department || '').trim() === recordDepartmentFilter

      const matchesYear = recordYearFilter === 'all'
        || String(record?.student_year || '').trim() === recordYearFilter

      return matchesDepartment && matchesYear
    })
  }, [records, recordDepartmentFilter, recordYearFilter])

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

  const loadStudentDirectory = async () => {
    const response = await cpanelApi.gateVolunteerSearchStudents({ token, query: '' })
    setStudentDirectory(Array.isArray(response?.students) ? response.students : [])
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
      } else if (student?.student_code) {
        setEntryMessage('Student record found in DB. Ready to grant entry.')
        if (autoGrant && !isSubmittingEntry) {
          await grantEntry({
            studentCode: String(student.student_code || studentCode || '').toUpperCase(),
            qrData: String(qrData || ''),
            method: 'qr'
          })
          return
        }
      } else {
        setEntryError('Student record is invalid for entry')
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
      await Promise.all([
        loadRecords(entryDate),
        loadStudentDirectory()
      ])
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

  const getCameraStream = async (preferredFacingMode) => {
    const constraintsAttempts = [
      {
        video: {
          facingMode: { exact: preferredFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: {
          facingMode: { ideal: preferredFacingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      },
      {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      }
    ]

    let lastError = null
    for (const constraints of constraintsAttempts) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints)
      } catch (error) {
        lastError = error
      }
    }

    throw lastError || new Error('Camera is unavailable')
  }

  const startScanner = async (preferredFacingMode = cameraFacingMode) => {
    setScannerError('')

    try {
      const stream = await getCameraStream(preferredFacingMode)

      mediaStreamRef.current = stream
      const [track] = stream.getVideoTracks()
      const detectedFacingMode = String(track?.getSettings?.().facingMode || '').toLowerCase()
      if (detectedFacingMode.includes('user')) {
        setCameraFacingMode('user')
      } else if (detectedFacingMode.includes('environment')) {
        setCameraFacingMode('environment')
      } else {
        setCameraFacingMode(preferredFacingMode)
      }

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
            async (result) => {
              if (isScanProcessingRef.current) {
                return
              }

              const scannedRaw = String(result?.getText?.() || '').trim()
              if (!scannedRaw) {
                return
              }

              isScanProcessingRef.current = true
              try {
                setQrInput(scannedRaw)
                setEntryMessage('QR captured. Checking student record in DB...')
                setEntryError('')
                await resolveDetectedStudent({ qrData: scannedRaw, studentCode: '', autoGrant: true })
              } finally {
                isScanProcessingRef.current = false
              }
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
            if (isScanProcessingRef.current) {
              return
            }

            isScanProcessingRef.current = true
            setQrInput(scannedRaw)
            setEntryMessage('QR captured. Checking student record in DB...')
            setEntryError('')
            try {
              await resolveDetectedStudent({ qrData: scannedRaw, studentCode: '', autoGrant: true })
            } finally {
              isScanProcessingRef.current = false
            }
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

  const handleCameraSwitch = async () => {
    if (cameraSwitching) {
      return
    }

    const nextFacingMode = cameraFacingMode === 'environment' ? 'user' : 'environment'
    setCameraFacingMode(nextFacingMode)
    setScannerError('')

    if (!scannerEnabled) {
      return
    }

    setCameraSwitching(true)
    stopScanner()
    try {
      await startScanner(nextFacingMode)
    } finally {
      setCameraSwitching(false)
    }
  }

  const decodeQrFromImage = async (file) => {
    const imageUrl = URL.createObjectURL(file)

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Unable to read selected image'))
        img.src = imageUrl
      })

      if (canUseBarcodeDetector) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
          const barcodes = await detector.detect(image)
          if (Array.isArray(barcodes) && barcodes[0]?.rawValue) {
            return String(barcodes[0].rawValue).trim()
          }
        } catch {
          // Ignore and continue with jsQR fallback.
        }
      }

      const canvas = scanCanvasRef.current || document.createElement('canvas')
      scanCanvasRef.current = canvas

      const width = image.naturalWidth || image.width || 0
      const height = image.naturalHeight || image.height || 0
      if (width <= 0 || height <= 0) {
        throw new Error('Uploaded image has invalid dimensions')
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      if (!ctx) {
        throw new Error('Unable to process uploaded image')
      }

      ctx.drawImage(image, 0, 0, width, height)
      const imageData = ctx.getImageData(0, 0, width, height)
      const code = jsQR(imageData.data, width, height, { inversionAttempts: 'attemptBoth' })
      return String(code?.data || '').trim()
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  const handleQrImageUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) {
      return
    }

    if (!String(file.type || '').startsWith('image/')) {
      setImageScanError('Please choose an image file')
      return
    }

    setImageScanLoading(true)
    setImageScanError('')
    setEntryError('')
    setEntryMessage('')

    try {
      const scannedRaw = await decodeQrFromImage(file)
      if (!scannedRaw) {
        throw new Error('No QR code found in selected image')
      }

      setQrInput(scannedRaw)
      setEntryMessage('QR detected from image. Checking student record in DB...')
      await resolveDetectedStudent({ qrData: scannedRaw, studentCode: '', autoGrant: true })
    } catch (error) {
      setImageScanError(error?.message || 'Unable to detect QR code from image')
    } finally {
      setImageScanLoading(false)
    }
  }

  const handleSearch = async (e) => {
    e.preventDefault()

    setSearchLoading(true)
    setEntryError('')
    setEntryMessage('')

    try {
      await loadStudentDirectory()
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
      
      // Store entry and show label
      if (response?.entry) {
        setLastEntry(response.entry)
        setShowEntryLabel(true)
      }
      
      setManualStudentCode('')
      setQrInput('')
      setSearchText('')
      await loadStudentDirectory()
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

  const fetchAllEntryRecordsForExport = async () => {
    const response = await cpanelApi.gateVolunteerListAllEntries({ token, limit: 50000 })
    return Array.isArray(response?.records) ? response.records : []
  }

  const filterRowsForRecordExport = (rows) => rows.filter((row) => {
    const matchesDate = String(row?.entry_date || '') === String(entryDate || '')
    const matchesDepartment = recordDepartmentFilter === 'all'
      || String(row?.student_department || '').trim() === recordDepartmentFilter
    const matchesYear = recordYearFilter === 'all'
      || String(row?.student_year || '').trim() === recordYearFilter

    return matchesDate && matchesDepartment && matchesYear
  })

  const createExcelHtmlTable = (rows) => {
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

    const tableRows = rows.map((row) => `
      <tr>
        <td>${escapeHtml(row.entry_date)}</td>
        <td>${escapeHtml(row.entry_at)}</td>
        <td>${escapeHtml(row.student_name)}</td>
        <td>${escapeHtml(row.student_code)}</td>
        <td>${escapeHtml(row.student_department || '-')}</td>
        <td>${escapeHtml(row.student_year || '-')}</td>
        <td>${escapeHtml(row.entry_method)}</td>
        <td>${escapeHtml(row.entry_by)}</td>
      </tr>
    `).join('')

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            table { border-collapse: collapse; width: 100%; font-family: Arial, sans-serif; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: left; font-size: 12px; }
            th { background: #f2f2f2; }
          </style>
        </head>
        <body>
          <h3>Gate Entry Records</h3>
          <table>
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
              </tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `
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

  const handleExportExcel = async () => {
    setEntryError('')
    setEntryMessage('')
    setIsExportingExcel(true)

    try {
      const allRows = await fetchAllEntryRecordsForExport()
      const rows = filterRowsForRecordExport(allRows)
      if (rows.length === 0) {
        setEntryError('No entry records available to export')
        return
      }

      const html = createExcelHtmlTable(rows)
      const today = new Date().toISOString().slice(0, 10)
      downloadFile({
        content: html,
        mimeType: 'application/vnd.ms-excel;charset=utf-8',
        fileName: `gate_entry_records_${today}.xls`
      })
      setEntryMessage(`Exported ${rows.length} records to Excel`)
    } catch (error) {
      setEntryError(error?.message || 'Unable to export Excel file')
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setEntryError('')
    setEntryMessage('')
    setIsExportingPdf(true)

    try {
      const allRows = await fetchAllEntryRecordsForExport()
      const rows = filterRowsForRecordExport(allRows)
      if (rows.length === 0) {
        setEntryError('No entry records available to export')
        return
      }

      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ])

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
      doc.setFontSize(12)
      doc.text('Gate Entry Records', 40, 36)

      autoTable(doc, {
        startY: 50,
        head: [['Date', 'Time', 'Student', 'Code', 'Department', 'Year', 'Method', 'By']],
        body: rows.map((row) => [
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
      doc.save(`gate_entry_records_${today}.pdf`)
      setEntryMessage(`Exported ${rows.length} records to PDF`)
    } catch (error) {
      setEntryError(error?.message || 'Unable to export PDF file')
    } finally {
      setIsExportingPdf(false)
    }
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
          <div className="gate-tabs" role="tablist" aria-label="Gate volunteer sections">
            <button
              type="button"
              className={`gate-tab-btn ${activeTab === 'scan' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('scan')}
              role="tab"
              aria-selected={activeTab === 'scan'}
            >
              Scan QR
            </button>
            <button
              type="button"
              className={`gate-tab-btn ${activeTab === 'search' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('search')}
              role="tab"
              aria-selected={activeTab === 'search'}
            >
              Search Student
            </button>
            <button
              type="button"
              className={`gate-tab-btn ${activeTab === 'records' ? 'is-active' : ''}`}
              onClick={async () => {
                setActiveTab('records')
                await loadRecords(entryDate)
              }}
              role="tab"
              aria-selected={activeTab === 'records'}
            >
              View Records ({records.length})
            </button>
          </div>
          <p className="gate-tab-hint">{activeTabHint}</p>
        </section>

        {portalError ? <div className="gate-alert gate-alert-error">{portalError}</div> : null}

        {activeTab === 'scan' ? (
        <section className="gate-card">
          <h2>Scan Or Enter QR</h2>
          <p>Entry is granted for any valid student code. One entry is allowed per student per day.</p>

          <div className="scan-tools">
            <p className="scan-tools-title">Scan Selection</p>
            <div className="scanner-actions">
              <button type="button" className="gate-btn" onClick={() => startScanner()} disabled={scannerEnabled || cameraSwitching}>Start Camera Scan</button>
              <button type="button" className="gate-btn gate-btn-muted" onClick={stopScanner} disabled={!scannerEnabled || cameraSwitching}>Stop Camera</button>
              <button type="button" className="gate-btn" onClick={handleCameraSwitch} disabled={cameraSwitching || !scannerEnabled}>
                {cameraSwitching
                  ? 'Switching Camera...'
                  : cameraFacingMode === 'environment'
                    ? 'Switch To Front Camera'
                    : 'Switch To Back Camera'}
              </button>
              <button
                type="button"
                className="gate-btn"
                onClick={() => uploadInputRef.current?.click()}
                disabled={imageScanLoading}
              >
                {imageScanLoading ? 'Processing Photo...' : 'Scan From Photo'}
              </button>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                onChange={handleQrImageUpload}
                className="scanner-upload-input"
              />
            </div>
          </div>

          <div className="scanner-preview-wrap">
            <video ref={videoRef} className="scanner-preview" autoPlay muted playsInline />
          </div>
          {scannerError ? <div className="gate-alert gate-alert-error">{scannerError}</div> : null}
          {imageScanError ? <div className="gate-alert gate-alert-error">{imageScanError}</div> : null}

          <form onSubmit={handleManualEntry} className="manual-entry-form">
            <p className="manual-entry-title">Manual Selection</p>
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
            <div className="search-item resolved-student-card">
              <div>
                <strong>{resolvedStudent.name}</strong>
                <p>{resolvedStudent.student_code} · {resolvedStudent.department || '-'} · {resolvedStudent.year || '-'}</p>
                <p>Payment Status: {formatPaymentStatus(resolvedStudent.payment_status)}</p>
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
              placeholder="Type name, code, department, or year"
            />
            <button type="submit" className="gate-btn" disabled={searchLoading}>
              {searchLoading ? 'Refreshing...' : 'Refresh List'}
            </button>
          </form>

          <div className="search-filter-row">
            <label>
              Department
              <select value={searchDepartmentFilter} onChange={(e) => setSearchDepartmentFilter(e.target.value)}>
                <option value="all">All Departments</option>
                {searchDepartmentOptions.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
            </label>
            <label>
              Year
              <select value={searchYearFilter} onChange={(e) => setSearchYearFilter(e.target.value)}>
                <option value="all">All Years</option>
                {searchYearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="search-meta">
            Loaded students: {studentDirectory.length} | Showing: {filteredSearchResults.length}
          </p>

          <div className="search-list">
            {filteredSearchResults.length === 0 && !searchLoading ? (
              <div className="search-empty">No students match the current search.</div>
            ) : null}

            {filteredSearchResults.map((student) => (
              <div key={student.student_code} className="search-item">
                <div>
                  <strong>{student.name}</strong>
                  <p>{student.student_code} · {student.department || '-'} · {student.year || '-'}</p>
                  <p>Payment Status: {formatPaymentStatus(student.payment_status)}</p>
                  {student.entered_today ? <p className="warn-text">Already entered today</p> : null}
                </div>
                <button
                  type="button"
                  className="gate-btn"
                  disabled={student.entered_today || isSubmittingEntry}
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
            <div className="records-toolbar-filters">
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
              <label>
                Department
                <select value={recordDepartmentFilter} onChange={(e) => setRecordDepartmentFilter(e.target.value)}>
                  <option value="all">All Departments</option>
                  {recordDepartmentOptions.map((department) => (
                    <option key={department} value={department}>{department}</option>
                  ))}
                </select>
              </label>
              <label>
                Year
                <select value={recordYearFilter} onChange={(e) => setRecordYearFilter(e.target.value)}>
                  <option value="all">All Years</option>
                  {recordYearOptions.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="records-toolbar-right">
              <div className="records-count-chip">{filteredRecords.length} shown / {records.length} records</div>
              <button
                type="button"
                className="gate-btn"
                onClick={handleExportExcel}
                disabled={isExportingExcel || isExportingPdf}
              >
                {isExportingExcel ? 'Exporting Excel...' : 'Export Excel'}
              </button>
              <button
                type="button"
                className="gate-btn"
                onClick={handleExportPdf}
                disabled={isExportingPdf || isExportingExcel}
              >
                {isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Student</th>
                  <th>Code</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Method</th>
                  <th>By</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-row">No entries found for selected date</td>
                  </tr>
                ) : filteredRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.entry_at}</td>
                    <td>{record.student_name}</td>
                    <td>{record.student_code}</td>
                    <td>{record.student_department || '-'}</td>
                    <td>{record.student_year || '-'}</td>
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

      {showEntryLabel && (
        <GateEntryLabel
          entry={lastEntry}
          onPrint={() => {
            // Entry label was printed
          }}
          onClose={() => {
            setShowEntryLabel(false)
            setLastEntry(null)
          }}
        />
      )}
    </div>
  )
}

export default GateVolunteerPortal

import { useRef } from 'react'
import './GateEntryLabel.css'

const GateEntryLabel = ({ entry, onPrint, onClose }) => {
  const labelRef = useRef(null)
  const isPaid = entry?.payment_status === 'paid'

  const handlePrint = async () => {
    if (!labelRef.current) return

    try {
      const printWindow = window.open('', '_blank')
      const labelHTML = labelRef.current.innerHTML

      const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Gate Entry Label - ${entry?.student_code}</title>
          <style>
            body {
              margin: 0;
              padding: 8px;
              font-family: Arial, sans-serif;
              background: white;
            }
            .label-container {
              width: 100%;
              max-width: 400px;
              margin: 0 auto;
              border: 2px dashed #333;
              padding: 12px;
              background: white;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            .label-header {
              text-align: center;
              margin-bottom: 12px;
              border-bottom: 2px solid #333;
              padding-bottom: 8px;
            }
            .label-title {
              font-size: 16px;
              font-weight: bold;
              margin: 0;
              color: #000;
            }
            .label-subtitle {
              font-size: 12px;
              margin: 4px 0 0 0;
              color: #666;
            }
            .label-body {
              font-size: 14px;
              color: #000;
            }
            .label-row {
              display: flex;
              gap: 12px;
              margin: 8px 0;
              align-items: center;
            }
            .label-label {
              font-weight: bold;
              min-width: 120px;
              color: #333;
            }
            .label-value {
              flex: 1;
              color: #000;
              word-break: break-word;
            }
            .payment-status {
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 12px;
              text-align: center;
              min-width: 80px;
            }
            .payment-status.paid {
              background-color: #d4edda;
              color: #155724;
              border: 1px solid #c3e6cb;
            }
            .payment-status.not-paid {
              background-color: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
            .label-footer {
              text-align: center;
              margin-top: 12px;
              padding-top: 8px;
              border-top: 2px solid #333;
              font-size: 11px;
              color: #666;
            }
            .timestamp {
              font-size: 11px;
              color: #999;
              margin-top: 8px;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .label-container {
                box-shadow: none;
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          ${labelHTML}
        </body>
        </html>
      `

      printWindow.document.write(printContent)
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.print()
      }, 250)

      if (onPrint) {
        onPrint()
      }
    } catch (error) {
      console.error('Error printing label:', error)
    }
  }

  if (!entry) {
    return null
  }

  return (
    <div className="gate-entry-label-modal">
      <div className="gate-entry-label-content">
        <div className="label-header-bar">
          <h2>Gate Entry Label</h2>
          <button className="label-close-btn" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="label-preview-section">
          <div ref={labelRef} className="label-container">
            <div className="label-header">
              <p className="label-title">SKF REFRESKO 2026</p>
              <p className="label-subtitle">Gate Entry Label</p>
            </div>

            <div className="label-body">
              <div className="label-row">
                <span className="label-label">Student Name:</span>
                <span className="label-value">{entry.student_name || '-'}</span>
              </div>

              <div className="label-row">
                <span className="label-label">Student Code:</span>
                <span className="label-value">{entry.student_code || '-'}</span>
              </div>

              <div className="label-row">
                <span className="label-label">Department:</span>
                <span className="label-value">{entry.student_department || '-'}</span>
              </div>

              <div className="label-row">
                <span className="label-label">Year:</span>
                <span className="label-value">{entry.student_year || '-'}</span>
              </div>

              <div className="label-row">
                <span className="label-label">Entry Time:</span>
                <span className="label-value">{entry.entry_at ? new Date(entry.entry_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}</span>
              </div>

              <div className="label-row">
                <span className="label-label">Payment Status:</span>
                <span className={`payment-status ${isPaid ? 'paid' : 'not-paid'}`}>
                  {isPaid ? 'PAID' : 'NOT PAID'}
                </span>
              </div>

              <div className="label-row">
                <span className="label-label">Entry Method:</span>
                <span className="label-value">{entry.entry_method ? entry.entry_method.toUpperCase() : '-'}</span>
              </div>
            </div>

            <div className="label-footer">
              <p className="timestamp">
                Generated on: {new Date().toLocaleString('en-IN', { 
                  year: 'numeric', 
                  month: '2-digit', 
                  day: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit' 
                })}
              </p>
              <p style={{ margin: '4px 0 0 0' }}>Please verify the student's identity with this label</p>
            </div>
          </div>
        </div>

        <div className="label-actions">
          <button
            className="label-print-btn"
            onClick={handlePrint}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print Label</span>
          </button>
          <button
            className="label-close-action-btn"
            onClick={onClose}
          >
            <span>Close</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default GateEntryLabel

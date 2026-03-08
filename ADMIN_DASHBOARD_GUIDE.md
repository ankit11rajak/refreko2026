# REFRESKO 2026 - Admin Dashboard Guide

## Overview
The Admin Dashboard provides comprehensive tools for managing event registrations, payments, and viewing detailed analytics for Refresko 2026.

## Access
- **URL**: `/admin`
- Navigate to: `http://localhost:5173/admin` (development)

## Features

### 1. Payment Management
View and manage all payment transactions with detailed information.

#### Features:
- **Summary Cards**
  - Total Revenue (completed payments)
  - Pending Amount (awaiting confirmation)
  - Total Registrations count

- **Search & Filter**
  - Search by name, email, or payment ID
  - Filter by status: All, Completed, Pending
  - Real-time filtering

- **Payment Table**
  - Payment ID
  - Student details (name, email)
  - College & Department
  - Event name
  - Amount paid
  - Status badge (completed/pending)
  - Payment date
  - Action buttons

- **Actions**
  - 👁️ **View Receipt**: Opens detailed receipt modal
  - 📥 **Download Receipt**: Download receipt as PDF

#### Receipt Modal
Displays complete payment information:
- Payment & Transaction IDs
- Student details
- College & Department info
- Academic year
- Event name
- Payment method (UPI/Card)
- Amount paid with status
- Download as PDF option

---

### 2. Analytics Dashboard
View comprehensive analytics based on different parameters.

#### Views Available:

**A. Department-wise Analysis**
- Visual bar chart showing participation by department
- Departments included:
  - Computer Science
  - Electrical Engineering
  - Mechanical Engineering
  - Civil Engineering
  - Electronics & Communication
  - Information Technology
- Shows:
  - Number of participants
  - Percentage distribution
  - Revenue generated per department

**B. Year-wise Analysis**
- Participation breakdown by academic year
- Years covered:
  - 1st Year
  - 2nd Year
  - 3rd Year
  - 4th Year
- Shows:
  - Student count per year
  - Percentage distribution
  - Revenue per year

**C. Event-wise Analysis**
- Registration statistics per event
- Events tracked:
  - Coding Competition
  - Robo Wars
  - Design Challenge
  - Cultural Performance
  - Dance Competition
  - Gaming Tournament
- Shows:
  - Registration count
  - Percentage of total registrations

#### Export Options
- **Download as PDF**: Export analytics report as PDF
- **Download as CSV**: Export data as CSV for further analysis

---

## Data Structure

### Payment Object
```javascript
{
  id: 'PAY001',
  studentName: 'Student Name',
  email: 'email@example.com',
  college: 'College Name',
  department: 'Department Name',
  year: '3rd Year',
  event: 'Event Name',
  amount: 500,
  status: 'completed', // or 'pending'
  date: '2026-02-10',
  transactionId: 'TXN1234567890',
  paymentMethod: 'UPI' // or 'Card'
}
```

### Department Analytics Object
```javascript
{
  department: 'Computer Science',
  count: 45,
  revenue: 22500
}
```

### Year Analytics Object
```javascript
{
  year: '1st Year',
  count: 35,
  revenue: 17500
}
```

### Event Analytics Object
```javascript
{
  event: 'Coding Competition',
  registrations: 42
}
```

---

## Integration Guide

### Connecting to Backend API

Replace the sample data with your API endpoints:

#### 1. Payment Management (PaymentManagement.jsx)
```javascript
// Replace sample data
const [payments, setPayments] = useState([])

useEffect(() => {
  // Fetch from API
  fetch('/api/payments')
    .then(res => res.json())
    .then(data => setPayments(data))
}, [])
```

#### 2. Analytics (Analytics.jsx)
```javascript
// Fetch analytics data
useEffect(() => {
  Promise.all([
    fetch('/api/analytics/departments').then(r => r.json()),
    fetch('/api/analytics/years').then(r => r.json()),
    fetch('/api/analytics/events').then(r => r.json())
  ]).then(([depts, years, events]) => {
    setDepartmentData(depts)
    setYearData(years)
    setEventData(events)
  })
}, [])
```

### API Endpoints Required

```
GET  /api/payments              - List all payments
GET  /api/payments/:id          - Get payment details
GET  /api/analytics/departments - Department-wise data
GET  /api/analytics/years       - Year-wise data
GET  /api/analytics/events      - Event-wise data
POST /api/receipts/download     - Generate PDF receipt
```

---

## Authentication

Add authentication middleware:

```javascript
// In Admin.jsx
useEffect(() => {
  // Check if user is authenticated
  const checkAuth = async () => {
    const response = await fetch('/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (!response.ok) {
      navigate('/login')
    }
  }
  
  checkAuth()
}, [])
```

---

## Styling Customization

All styles use CSS custom properties from the main design system:
- `--color-primary`: #FF0033
- `--color-secondary`: #FFFFFF
- `--color-background`: #050505
- `--font-heading`: 'Orbitron'
- `--font-body`: 'Rajdhani'

Modify colors in `Admin.css`, `PaymentManagement.css`, or `Analytics.css`.

---

## Mobile Responsive

The dashboard is fully responsive:
- **Desktop**: Full table view with all features
- **Tablet**: Optimized layout with scrollable tables
- **Mobile**: Stack layout, touch-friendly buttons

---

## Future Enhancements

Potential additions:
1. Real-time notifications for new payments
2. Export individual receipts in bulk
3. Email receipt functionality
4. Advanced filtering (date range, amount range)
5. Payment status update functionality
6. Refund management
7. Custom analytics date range
8. Dashboard widgets customization
9. Multi-admin role management
10. Activity logs

---

## Support

For technical issues or feature requests:
- Email: admin@refresko.skf.edu
- Documentation: [Link to full docs]

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Developed for**: REFRESKO 2026 | Supreme Knowledge Foundation

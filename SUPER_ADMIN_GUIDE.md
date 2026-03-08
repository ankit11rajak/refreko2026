# Super Admin Dashboard - Documentation

## Overview
The Super Admin Dashboard is a comprehensive management system for Refresko 2026 that provides complete control over events, payments, student accounts, and analytics.

## Features

### 1. Event Management
- **Add New Events**: Create events with detailed information:
  - Event name, category (Technical/Cultural/Sports/Workshop)
  - Description, base amount, team size
  - Venue, date, time, max participants
  - Prize money
  
- **Edit Events**: Modify existing event details
- **Status Control**: Activate/deactivate events
- **Delete Events**: Remove events (with confirmation)
- **Live Statistics**: 
  - Total events count
  - Active events tracking
  - Total registrations across all events
  - Visual registration progress bars

### 2. Payment Amount Management
- **Individual Student Amounts**: Set custom payment amounts for each student per event
- **Search & Filter**: Find students by name, email, or student ID
- **Bulk Updates**: Update multiple student amounts at once
- **Event-wise Amount Control**: 
  - View base amounts for each event
  - Override amounts for specific students
  - Calculate total amounts automatically
- **Visual Summary**: Display total events and total payment amounts per student

### 3. Payment Details & Receipts
- **Payment Tracking**: 
  - View all payment transactions
  - Search by student name, event, or transaction ID
  - Filter by status (All/Pending/Completed/Failed)
  
- **Receipt Management**:
  - View detailed payment receipts
  - Download receipts as PDF
  - Transaction details including:
    - Payment method
    - Transaction ID
    - Date and time
    - Student and event information
    - Amount breakdown

- **Summary Cards**:
  - Total revenue
  - Pending payments
  - Completed transactions

### 4. Analytics Dashboard
Three comprehensive views:

- **Department-wise Analytics**:
  - Participant count per department
  - Revenue generated per department
  - Visual bar charts with percentages
  
- **Year-wise Analytics**:
  - Breakdown by student year (1st-4th)
  - Participation trends
  - Revenue analysis
  
- **Event-wise Analytics**:
  - Performance metrics per event
  - Registration counts
  - Revenue comparison
  
- **Export Options**: Download analytics as PDF or CSV

### 5. Student Account Management
- **View All Students**: Comprehensive student database with:
  - Student ID, name, email, phone
  - College, department, year, roll number
  - Registered events count
  - Account status (Active/Inactive)
  - Last login timestamp
  
- **Edit Student Details**:
  - Update personal information
  - Modify academic details
  - Change contact information
  
- **Account Control**:
  - Activate/deactivate student accounts
  - Reset student passwords (sends email)
  - Delete student accounts (with confirmation)
  
- **Search & Filter**:
  - Search by name, email, ID, or roll number
  - Filter by status (All/Active/Inactive)
  - Real-time filtering with counters

## Navigation Structure

```
Super Admin Dashboard
├── Event Management
│   ├── Add New Event
│   ├── Edit Event
│   ├── Toggle Status
│   └── Delete Event
├── Payment Amounts
│   ├── Search Students
│   ├── Edit Individual Amounts
│   └── Bulk Update
├── Payments & Receipts
│   ├── View All Payments
│   ├── Search & Filter
│   ├── View Receipt
│   └── Download Receipt
├── Analytics
│   ├── Department View
│   ├── Year View
│   ├── Event View
│   └── Export Data
└── Student Accounts
    ├── View Students
    ├── Edit Details
    ├── Reset Password
    ├── Toggle Status
    └── Delete Account
```

## Access URL
Navigate to: `http://localhost:5173/super-admin`

## Sample Data Structure

### Events
```javascript
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
}
```

### Students
```javascript
{
  id: 'STU001',
  name: 'Rajesh Kumar',
  email: 'rajesh.kumar@example.com',
  phone: '+91 98765 43210',
  college: 'Supreme Knowledge Foundation',
  department: 'Computer Science',
  year: '3rd Year',
  rollNumber: 'CS2021001',
  registeredEvents: ['EVT001', 'EVT002'],
  customAmounts: {
    'EVT001': 500,
    'EVT002': 1000
  },
  status: 'active',
  lastLogin: '2026-02-10 14:30'
}
```

### Payments
```javascript
{
  id: 'PAY001',
  studentName: 'Rajesh Kumar',
  college: 'Supreme Knowledge Foundation',
  department: 'Computer Science',
  year: '3rd Year',
  event: 'Coding Competition',
  amount: 500,
  status: 'completed',
  transactionId: 'TXN1234567890',
  paymentMethod: 'UPI',
  date: '2026-02-10',
  time: '14:30'
}
```

## Design System

### Colors
- Primary: `#FF0033` (Neon Red)
- Background: `#050505` (Deep Black)
- Secondary: `#FFFFFF` (White)
- Success: `#00FF66` (Neon Green)
- Warning: `#FFA500` (Orange)
- Info: `#0096FF` (Blue)

### Typography
- Headings: `Orbitron` (Futuristic, Bold)
- Body: `Rajdhani` (Clean, Modern)
- Monospace: System monospace

### Visual Effects
- Glassmorphism backgrounds
- Neon glow effects
- Smooth transitions and hover states
- Animated bar charts
- Modal overlays with backdrop blur

## Implementation Notes

### Backend Integration
All components currently use sample data. To integrate with backend:

1. **Event Management API**:
   ```javascript
   GET    /api/events              // Fetch all events
   POST   /api/events              // Create new event
   PUT    /api/events/:id          // Update event
   DELETE /api/events/:id          // Delete event
   PATCH  /api/events/:id/status   // Toggle status
   ```

2. **Payment Amount API**:
   ```javascript
   GET    /api/students/amounts    // Fetch students with custom amounts
   PUT    /api/students/:id/amounts // Update student amounts
   POST   /api/students/amounts/bulk // Bulk update
   ```

3. **Payment API**:
   ```javascript
   GET    /api/payments            // Fetch all payments
   GET    /api/payments/:id        // Get payment details
   GET    /api/payments/:id/receipt // Generate receipt
   ```

4. **Analytics API**:
   ```javascript
   GET    /api/analytics/department // Department-wise data
   GET    /api/analytics/year       // Year-wise data
   GET    /api/analytics/event      // Event-wise data
   ```

5. **Student Management API**:
   ```javascript
   GET    /api/students            // Fetch all students
   PUT    /api/students/:id        // Update student details
   POST   /api/students/:id/reset-password // Reset password
   PATCH  /api/students/:id/status // Toggle account status
   DELETE /api/students/:id        // Delete student
   ```

### Security Considerations
- Implement proper authentication middleware
- Use role-based access control (RBAC)
- Validate all inputs on backend
- Encrypt sensitive data
- Implement rate limiting
- Add audit logs for critical actions
- Use HTTPS in production
- Implement CSRF protection

### Future Enhancements
- Email notifications for password resets
- Bulk import/export of students
- Advanced analytics with date range filters
- Event capacity management with waitlists
- Payment refund processing
- Automated payment reminders
- Multi-event discount management
- Student communication portal
- Real-time dashboard updates
- Custom report generation
- Event calendar view
- Attendance tracking
- Certificate generation

## Troubleshooting

### Common Issues

1. **Modal not closing**: Click outside the modal or use the × button
2. **Search not working**: Check if search term matches any field
3. **Filters not applying**: Ensure correct filter is selected
4. **Data not updating**: Refresh the page (backend integration needed)

### Browser Compatibility
- Chrome 90+ ✓
- Firefox 88+ ✓
- Safari 14+ ✓
- Edge 90+ ✓

## Support
For issues or feature requests, contact the development team.

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Developed for**: Refresko 2026 - Supreme Knowledge Foundation

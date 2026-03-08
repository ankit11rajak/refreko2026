# Supabase to MySQL Migration Guide

## Overview
This document outlines the complete migration of Refresko 2026 system from Supabase (PostgreSQL) to MySQL via cPanel backend. Since Supabase is blocked in India, all database operations now go through the MySQL backend exclusively.

## Migration Summary

### What Changed

#### Frontend Changes
1. **Removed Supabase Imports**
   - Removed `supabaseClient.js` import statements from all components
   - Removed `isSupabaseConfigured` and `supabase` imports

2. **Updated Components**
   - `Login.jsx`: Now uses `cpanelApi.getStudentByCode()` instead of Supabase `.from('students').select()`
   - `SKFDashboard.jsx`: Now uses `cpanelApi.getStudentByCode()` for payment status fetch
   - `PaymentManagement.jsx`: Now uses `cpanelApi.updateStudent()` instead of Supabase `.update()`
   - `Analytics.jsx`: Removed Supabase fetching logic, uses only cPanel API
   - `networkDiagnostics.js`: Supabase tests removed

3. **API Integration**
   - Added `getStudentByCode(studentCode)` to `cpanelApi.js`
   - Added `updateStudent(studentData)` to `cpanelApi.js`

#### MySQL Database (Already Configured)
The MySQL schema already includes all necessary columns:
- `students` table: Profile, payment, and gate pass statuses
- `payments` table: Payment records with student references
- `payment_gateway_config` table: Payment options
- `admin_users` table: Admin credentials

### Data Mapping

#### Field Mapping (MySQL/PHP Boolean Convention)
```javascript
// MySQL stores booleans as:
// 1 = true, 0 = false (TINYINT(1))

// Frontend receives:
// data.payment_completion === 1 || data.payment_completion === true

// Frontend sends (to MySQL via cPanel):
// { payment_completion: 1 } // or { payment_completion: 0 }
```

#### Student Record Structure
```javascript
{
  id: number,                    // MySQL primary key
  student_code: string,          // Unique student identifier
  name: string,                  // Student full name
  email: string,                 // Student email
  phone: string,                 // Student phone (10 digits)
  department: string,            // Department name
  year: string,                  // Academic year
  profile_completed: 0|1,        // Profile setup status
  payment_completion: 0|1,       // Payment submitted status
  gate_pass_created: 0|1,        // Gate pass generated status
  payment_approved: 'pending'|'approved'|'declined',  // Payment approval
  food_included: 0|1,            // Food preference included
  food_preference: 'VEG'|'NON-VEG'|null,  // Food preference type
  created_at: timestamp,         // Account creation time
  updated_at: timestamp          // Last update time
}
```

### API Endpoints Used

#### Student Operations
- **GET `/students/get`** - Fetch student by code
  - Query: `student_code` (required)
  - Returns: `{ success, student }`

- **POST `/students/upsert`** - Create/Update student profile
  - Body: Student record object
  - Returns: `{ success, message }`

#### Payment Operations
- **GET `/payments/list`** - List all payments
  - Query: `limit`, `offset`, `status`, `search`
  - Returns: `{ success, payments, total, has_more }`

- **POST `/payments/submit`** - Submit payment with screenshot
  - Body: FormData with payment details and screenshot
  - Returns: `{ success, payment_id, message }`

- **POST `/payments/decision`** - Update payment status
  - Body: `{ payment_id, decision 'approved'|'declined' }`
  - Returns: `{ success, message }`

### Authentication Flow

#### Student Login (MySQL)
```
1. Student enters: student_code + phone
2. cPanel API validates against MySQL students table
3. On match: Create authentication session
4. Access token stored in: localStorage.isAuthenticated
5. Student data cached in: localStorage.studentProfile
```

#### Admin Login (cPanel API)
```
1. Admin enters: email + password
2. cPanel API validates against MySQL admin_users table
3. On match: Set adminAuthenticated flag
4. Admin token stored in: localStorage.adminAuthenticated
```

### Data Synchronization

#### Student Profile → Payment Status
When admin approves/declines payment:
```javascript
// cPanel API calls:
cpanelApi.updateStudent({
  student_code: 'SKF001',
  payment_completion: 1,          // Payment was submitted
  gate_pass_created: 1,           // Gate pass can be generated
  payment_approved: 'approved'    // Payment approved
})
```

#### Updates sync to:
- MySQL `students` table
- Student's localStorage (next dashboard load)
- Student's next login session

### Removed Dependencies

1. **Supabase Client**
   - Library: `@supabase/supabase-js`
   - Can be removed from `package.json`
   - Environment variables `VITE_SUPABASE_*` no longer needed

2. **Supabase Configuration**
   - `supabaseClient.js` is no longer imported
   - Supabase auth tokens no longer used
   - Real-time subscriptions replaced with API polling

### Error Handling

#### Network Failures
- **Timeout**: 15-second request timeout (configured in cpanelApi.js)
- **Retry Logic**: Up to 3 retries with exponential backoff (1s, 2s, 3s)
- **CORS Errors**: Credentials set to 'omit' to prevent duplicate headers

#### User Errors
- **Student Code Not Found**: HTTP 404 from API
- **Invalid Phone**: Mismatch with phone in MySQL
- **Payment Failed**: Check MySQL payment records
- **VPN Required**: Some networks may require VPN for cPanel API access

### Testing Checklist

- [ ] Student login works with valid student_code + phone
- [ ] Payment submission saves to MySQL payments table
- [ ] Admin approval updates MySQL students table
- [ ] Gate pass QR code displays after payment approval
- [ ] Analytics page shows payment data from MySQL
- [ ] Student profile updates sync to MySQL
- [ ] Cross-device sync works (login from different device shows latest status)
- [ ] API errors display helpful user messages
- [ ] All network diagnostics show green status

### Rollback Plan

If issues arise:
1. Keep Supabase backups in a separate PostgreSQL instance (offline)
2. Maintain MySQL incremental backups
3. Use cPanel backup/restore functionality
4. Document all manual data corrections in logs

### Performance Considerations

- **Pagination**: Limit 500 records per API call to prevent timeouts
- **Batch Size**: cPanel fetches 500 records per request
- **Caching**: Student data cached in localStorage for 1 session
- **Polling**: No real-time subscriptions (admin checks payments manually)

### Next Steps

1. Delete `.env` Supabase variables from deployment
2. Update CI/CD pipeline to remove Supabase builds
3. Monitor cPanel API logs for errors
4. Schedule regular MySQL backups
5. Test VPN access for users in restricted networks

---

**Migration Date**: February 2026
**Status**: Complete
**Testing**: In Progress

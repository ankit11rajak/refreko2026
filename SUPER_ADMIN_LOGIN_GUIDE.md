# Super Admin Login Setup Guide

## Overview
The Super Admin dashboard now has a secure login system that authenticates users via Supabase database credentials.

## Setup Instructions

### 1. Create the Database Table

Run the SQL script in your Supabase project:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `supabase_setup_super_admin.sql`
4. Copy and paste the entire SQL script
5. Click **RUN** to execute

This will create:
- `super_admin_credentials` table
- A default admin account (username: `superadmin`, password: `Admin@2026`)
- Necessary indexes and security policies

### 2. Change Default Credentials

**IMPORTANT**: Change the default credentials immediately!

Run this SQL in Supabase SQL Editor:

```sql
UPDATE super_admin_credentials 
SET 
  username = 'your_new_username',
  password = 'your_secure_password',
  full_name = 'Your Full Name',
  email = 'your_email@skf.edu.in'
WHERE username = 'superadmin';
```

### 3. Verify Supabase Configuration

Make sure your `.env` file has the correct Supabase credentials:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Using the Login System

### Accessing the Super Admin Dashboard

1. Navigate to `/super-admin`
2. You'll see a secure login page
3. Enter your username and password
4. Click "ACCESS DASHBOARD"

### Features

- **Session Persistence**: Your login session persists across browser refreshes
- **Error Handling**: Clear error messages for invalid credentials
- **Secure Authentication**: Credentials verified against Supabase database
- **Animated UI**: Modern, cyberpunk-themed login interface

### Login Flow

```
User visits /super-admin
    ↓
If not authenticated → Show login page
    ↓
User enters credentials
    ↓
Query Supabase super_admin_credentials table
    ↓
If valid → Store session → Show dashboard
If invalid → Show error message
```

## Security Features

1. **Session Storage**: Uses `sessionStorage` (cleared when browser closes)
2. **Active Status Check**: Only active admins can login (`is_active = true`)
3. **Database Verification**: Credentials checked against Supabase
4. **Protected Routes**: Dashboard only accessible after authentication

## Important Security Notes

⚠️ **PRODUCTION SECURITY RECOMMENDATIONS**:

1. **Password Hashing**: Currently uses plain text passwords. Implement bcrypt or argon2 hashing:
   ```javascript
   // Use bcrypt for hashing passwords
   const bcrypt = require('bcrypt')
   const hashedPassword = await bcrypt.hash(password, 10)
   ```

2. **Rate Limiting**: Add rate limiting to prevent brute force attacks

3. **2FA**: Implement two-factor authentication for additional security

4. **HTTPS Only**: Ensure your production site uses HTTPS

5. **Audit Logs**: Track all login attempts and admin actions

6. **Password Policies**: Enforce strong password requirements

## Adding New Super Admins

Run this SQL in Supabase:

```sql
INSERT INTO super_admin_credentials (username, password, full_name, email)
VALUES ('new_admin_username', 'secure_password', 'Admin Full Name', 'admin@skf.edu.in');
```

## Deactivating an Admin

```sql
UPDATE super_admin_credentials 
SET is_active = false 
WHERE username = 'username_to_deactivate';
```

## Troubleshooting

### "Database connection not configured" Error
- Check that your `.env` file has correct Supabase credentials
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Restart your development server after changing `.env`

### "Invalid username or password" Error
- Verify credentials exist in the database:
  ```sql
  SELECT username, is_active FROM super_admin_credentials;
  ```
- Ensure `is_active` is `true` for the account
- Check for typos in username/password

### Login Successful But Dashboard Doesn't Show
- Check browser console for errors
- Clear your browser's session storage
- Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

## Database Schema

```sql
super_admin_credentials
├── id (BIGSERIAL PRIMARY KEY)
├── username (VARCHAR UNIQUE NOT NULL)
├── password (VARCHAR NOT NULL)
├── full_name (VARCHAR)
├── email (VARCHAR)
├── is_active (BOOLEAN DEFAULT true)
├── last_login (TIMESTAMP)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

## UI Features

- **Animated Background**: Circuit pattern with data stream animation
- **Glowing Lock Icon**: Pulsing security indicator
- **Text Glitch Effect**: Cyberpunk-style text animation
- **Responsive Design**: Works on all screen sizes
- **Loading States**: Visual feedback during authentication
- **Error Animations**: Shake effect for error messages

## Support

For issues or questions, contact the technical team or refer to the main project documentation.

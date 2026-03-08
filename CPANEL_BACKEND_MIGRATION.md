# cPanel Backend Migration Guide

Your frontend is now fully integrated with the cPanel backend APIs while maintaining localStorage as a fallback. Follow these steps to deploy and activate.

---

## Overview

**What Changed:**
- ✅ **Payment Submissions**: Now POST to `/payments/submit` (multipart) with screenshots stored on server
- ✅ **Payment Approvals**: Admin decisions sync via `/payments/decision` API
- ✅ **Payment Gateway Config**: Super admin payment amount/QR settings sync via `/config/active` API
- ✅ **Admin Account Management**: CRUD operations via `/admin/*` endpoints (list, create, update, delete)
- ✅ **Payment List**: Admin panel loads from `/payments/list` API

**What Stayed The Same:**
- ✅ **Supabase Integration**: Student authentication and profile management unchanged (Login, ProfileSetup, SKFDashboard still use Supabase)
- ✅ **localStorage Fallback**: If `VITE_CPANEL_API_BASE_URL` is not set or API fails, all operations fall back to localStorage (zero downtime during migration)
- ✅ **UI/UX**: Identical user experience, no visible changes to students or admins

---

## Step 1: Deploy Backend to cPanel

**Prerequisites:**
- cPanel account with PHP 8.2+ support
- Subdomain configured (e.g., `api.yourdomain.com`)
- Database created (MySQL 5.7+/MariaDB 10.3+)

**Deployment:**

1. **Upload `cpanel_backend_api.zip`** to cPanel File Manager at the subdomain's public_html directory:
   ```
   /home/username/public_html/api/    (for api.yourdomain.com)
   ```

2. **Extract the ZIP** using File Manager's Extract feature.

3. **Configure Database**:
   - Open `config/env.php`
   - Fill in your MySQL credentials:
     ```php
     const DB_HOST = 'localhost';
     const DB_NAME = 'your_database_name';
     const DB_USER = 'your_db_user';
     const DB_PASS = 'your_db_password';
     ```
   - Update `ALLOWED_ORIGINS` to include your Vercel domain:
     ```php
     const ALLOWED_ORIGINS = [
       'https://refresko2026.vercel.app',
       'http://localhost:5173',
       'http://localhost:4173'
     ];
     ```

4. **Run SQL Schema**:
   - Go to cPanel → phpMyAdmin
   - Select your database
   - Import `sql/01_schema.sql`
   - Import `sql/02_seed_config.sql` (optional, creates default payment options)

5. **Set File Permissions**:
   ```bash
   chmod 755 uploads
   chmod 755 uploads/payment-proofs
   ```

6. **Test Health Endpoint**:
   ```
   https://api.yourdomain.com/health
   ```
   **Expected Response:**
   ```json
   {
     "success": true,
     "status": "healthy",
     "timestamp": "2026-02-16T12:34:56Z",
     "database": "connected"
   }
   ```

---

## Step 2: Update Frontend Environment Variable

**Local Development:**

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Set the cPanel API URL:
   ```env
   VITE_CPANEL_API_BASE_URL=https://api.yourdomain.com
   VITE_SUPABASE_URL=your_existing_supabase_url
   VITE_SUPABASE_ANON_KEY=your_existing_supabase_key
   ```

3. Restart dev server:
   ```bash
   npm run dev
   ```

**Vercel Deployment:**

1. Go to your Vercel project settings → Environment Variables
2. Add:
   ```
   Name: VITE_CPANEL_API_BASE_URL
   Value: https://api.yourdomain.com
   ```
3. Keep existing Supabase variables unchanged
4. Redeploy (Vercel auto-deploys on next push or click "Redeploy" button)

---

## Step 3: Test Integration (Pre-Production)

**Test Payment Flow:**
1. Login as SKF student
2. Navigate to Dashboard → Make Payment
3. Fill details, upload screenshot, submit
4. **Check cPanel Database**:
   - `payments` table should have new row
   - `used_utr_registry` should have UTR entry
   - `uploads/payment-proofs/` should have image file
5. **Check Browser DevTools** → Network tab:
   - Should see `POST /payments/submit` with status 201
   - If API fails, check console for fallback warning

**Test Admin Approval:**
1. Login to `/admin`
2. View submitted payment
3. Click Approve/Decline
4. **Check cPanel Database**:
   - `payments.payment_approved` should update
   - `payments.reviewed_at` should be set

**Test Super Admin Config:**
1. Login to `/superadmin`
2. Navigate to "Payment Amounts" tab
3. Change active amount or toggle food inclusion
4. **Check cPanel Database**:
   - `payment_gateway_config.is_active` should update
   - Student dashboard should reflect new amount

**Test Admin Account Management:**
1. Super Admin → "Admin Login Control" tab
2. Create new admin
3. **Check cPanel Database**:
   - `admin_users` table should have new row with hashed password
4. Logout, try logging in with new admin credentials at `/login/admin`

---

## Step 4: Verify Fallback Behavior

**Test localStorage Fallback:**
1. In `.env`, temporarily remove or comment `VITE_CPANEL_API_BASE_URL`
2. Rebuild:
   ```bash
   npm run build
   npm run preview
   ```
3. Test payment submission → should work with localStorage
4. Check console → should see "CPANEL_API_BASE_URL_MISSING" warning

**Expected Behavior:**
- Payment submission saves to `localStorage.paymentSubmissions`
- Admin approval updates localStorage
- Payment config changes save to `localStorage.paymentGatewayConfig`
- Admin accounts save to `localStorage.adminAccounts`

---

## Step 5: Production Deployment

**Backend (cPanel):**
- ✅ Already deployed from Step 1
- Monitor `uploads/` directory size (images accumulate)
- Consider log rotation if implementing error logging

**Frontend (Vercel):**
1. Verify environment variable is set:
   ```
   VITE_CPANEL_API_BASE_URL=https://api.yourdomain.com
   ```
2. Push latest changes to GitHub:
   ```bash
   git add .
   git commit -m "feat: integrate cPanel backend APIs with localStorage fallback"
   git push origin main
   ```
3. Vercel auto-deploys (or manually trigger)
4. **Post-Deploy Check**:
   - Visit production URL
   - Open DevTools → Network
   - Submit payment → verify `POST https://api.yourdomain.com/payments/submit` succeeds

---

## Migration Notes

### Data Continuity
- **Existing localStorage data is preserved**: Students who submitted payments before migration will see them in admin panel (localStorage fallback)
- **New submissions go to database**: Once API is active, all new payments hit MySQL
- **Gradual migration**: Old localStorage records won't auto-migrate to database (admin can manually re-enter if needed, or leave as-is)

### Performance Expectations
- **2000 concurrent users**: Requires VPS or dedicated server (not shared hosting)
- **Recommended cPanel specs**:
  - 4 CPU cores
  - 8 GB RAM
  - PHP 8.2 with OPcache enabled
  - MySQL query cache enabled
- **Vercel (frontend)**: Pro plan recommended for traffic spikes

### Security Reminders
- ✅ **CORS configured**: Only Vercel domain can call API
- ✅ **File upload validation**: Server checks image MIME types and size limits
- ✅ **SQL injection prevention**: PDO prepared statements used throughout
- ✅ **Password hashing**: bcrypt for admin accounts
- ⚠️ **HTTPS required**: Ensure subdomain has SSL certificate (cPanel AutoSSL or Let's Encrypt)

### Database Schema Details
```sql
-- Main tables:
students             -- Syncs with Supabase for student profiles
payment_gateway_config  -- Tracks active QR/amount options
payments             -- All payment submissions with screenshots
used_utr_registry    -- UTR uniqueness validation
admin_users          -- Admin/SuperAdmin credentials

-- Foreign key: payments.student_code → students.student_code
```

---

## Troubleshooting

**Error: "CPANEL_API_BASE_URL_MISSING"**
- Cause: Environment variable not set
- Fix: Add `VITE_CPANEL_API_BASE_URL` to `.env` or Vercel settings

**Error: "Unable to submit payment" (500)**
- Cause: Database connection failed or SQL error
- Fix:
  1. Check `config/env.php` credentials
  2. Verify database exists and schema is imported
  3. Check cPanel error logs

**Error: "Route not found" (404)**
- Cause: `.htaccess` not working or mod_rewrite disabled
- Fix:
  1. Verify `.htaccess` exists in root (`/public_html/api/`)
  2. Check cPanel → PHP Settings → Enable mod_rewrite
  3. Test direct endpoint: `https://api.yourdomain.com/index.php/health`

**Error: "CORS blocked" in browser console**
- Cause: Vercel domain not in `ALLOWED_ORIGINS`
- Fix: Update `config/env.php` and add your domain

**Performance: API slow with many payments**
- Cause: Missing database indexes
- Fix: Run `sql/03_validation_queries.sql` to check indexes
- Optimization: Add index on `payments.created_at` for faster sorting:
  ```sql
  CREATE INDEX idx_payments_created_at ON payments(created_at);
  ```

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/config/active` | GET | Get active payment config |
| `/config/active` | POST | Update payment config (upsert multiple options) |
| `/students/get?student_code=X` | GET | Fetch student profile |
| `/students/upsert` | POST | Create/update student |
| `/payments/list?status=X&search=Y&limit=N` | GET | Load payments for admin panel |
| `/payments/submit` | POST (multipart) | Submit payment with screenshot |
| `/payments/decision` | POST | Approve/decline payment |
| `/admin/login` | POST | Admin authentication |
| `/admin/list` | GET | List all admin accounts |
| `/admin/create` | POST | Create new admin |
| `/admin/update` | POST | Update admin (status, password, name) |
| `/admin/delete` | POST | Delete admin account |

---

## Rollback Plan

If issues arise, you can instantly roll back without data loss:

**Option 1: Disable API (keep frontend unchanged)**
1. In Vercel → Environment Variables → Delete `VITE_CPANEL_API_BASE_URL`
2. Redeploy
3. Frontend reverts to localStorage-only mode

**Option 2: Revert frontend code**
1. Git revert to previous commit:
   ```bash
   git revert HEAD
   git push origin main
   ```
2. Vercel auto-deploys reverted version

**Data Preservation:**
- localStorage data: Never deleted (remains in user browsers)
- cPanel database: Remains intact for future retry
- Supabase: Unchanged throughout migration

---

## Post-Deployment Checklist

- [ ] Health endpoint returns "connected" for database
- [ ] Student can submit payment and see it in admin panel
- [ ] Admin can approve/decline payment
- [ ] Super admin can change payment amount and student sees new QR
- [ ] Super admin can create admin account
- [ ] New admin can login and access admin panel
- [ ] Uploaded payment screenshots visible in cPanel File Manager
- [ ] Browser DevTools shows successful API calls (no 404/500 errors)
- [ ] CORS is working (no blocked requests in console)

---

## Support Commands

**Check cPanel logs (via SSH or Terminal in cPanel):**
```bash
tail -f ~/public_html/api/error.log  # If you add error logging
tail -f /var/log/apache2/error_log   # Apache errors
```

**Test API from command line:**
```bash
# Health check
curl https://api.yourdomain.com/health

# Get active config
curl https://api.yourdomain.com/config/active

# Admin login (test)
curl -X POST https://api.yourdomain.com/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@admin.com","password":"yourpassword"}'
```

---

**Migration Complete!** 🎉

Your system now operates with cPanel database storage while maintaining localStorage resilience. Both data sources coexist—new records route to MySQL, old localStorage records remain accessible.

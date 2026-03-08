# Payment Database Storage Fix

## Problem
Payments submitted from new accounts were not being stored in the cPanel database `payments` table, only in localStorage.

## Root Causes Identified

### 1. **Silent Error Suppression (Frontend)**
**File:** `src/pages/PaymentGateway.jsx` (Line 272)
- **Issue:** API errors were caught and logged as warnings, but the form continued with localStorage fallback
- **Impact:** Users never saw that their payment failed to reach the database
- **Fix:** Now shows error message to user and stops form submission

```javascript
// BEFORE:
catch (apiError) {
  console.warn('cPanel API payment submission failed, using localStorage fallback:', apiError)
}
// Form continued to success...

// AFTER:
catch (apiError) {
  console.error('Payment submission to database failed:', apiError)
  setFormError(`Payment submission failed: ${errorMessage}. Please try again.`)
  setPaymentStatus('idle')
  return  // STOPS HERE - no localStorage fallback
}
```

### 2. **Upload Function Exits Transaction (Backend)**
**File:** `cpanel_backend_api/lib/upload.php`
- **Issue:** `store_payment_proof()` called `json_response()` directly on errors, exiting before the transaction could rollback
- **Impact:** If file upload failed (directory not writable, file too large, wrong format), the transaction was abandoned
- **Fix:** Changed to throw exceptions so try-catch in `payments.php` can handle them

```php
// BEFORE:
if (!move_uploaded_file($file['tmp_name'], $target)) {
    json_response(['success' => false, 'message' => 'Unable to save file'], 500);
}

// AFTER:
if (!move_uploaded_file($file['tmp_name'], $target)) {
    throw new Exception('Unable to save file to: ' . $target);
}
```

### 3. **Upload Called Outside Transaction**
**File:** `cpanel_backend_api/routes/payments.php` (Line 97)
- **Issue:** `store_payment_proof()` was called BEFORE starting the transaction
- **Impact:** If upload succeeded but database insert failed, orphan files were created
- **Fix:** Moved inside try-catch block after `$pdo->beginTransaction()`

### 4. **Generic Validation Error Messages**
**File:** `cpanel_backend_api/routes/payments.php` (Lines 52-69)
- **Issue:** Single "Missing required payment fields" message didn't specify which field
- **Impact:** Hard to debug which field was missing or invalid
- **Fix:** Individual validation with specific error messages

```php
// BEFORE:
if ($studentCode === '' || $studentName === '' || $utrNo === '' || ...) {
    json_response(['success' => false, 'message' => 'Missing required payment fields'], 422);
}

// AFTER:
if ($studentCode === '') {
    json_response(['success' => false, 'message' => 'student_code is required'], 422);
}
if ($studentName === '') {
    json_response(['success' => false, 'message' => 'student_name is required'], 422);
}
// ... individual checks for each field
```

### 5. **Insufficient Error Logging**
**File:** `cpanel_backend_api/routes/payments.php` (Line 228)
- **Issue:** Errors were caught but not logged to PHP error log
- **Impact:** Hard to debug production issues without server logs
- **Fix:** Added `error_log()` with message and stack trace

```php
// ADDED:
error_log('Payment submission error: ' . $error->getMessage());
error_log('Payment submission trace: ' . $error->getTraceAsString());
```

## Common Failure Scenarios & Solutions

### Scenario 1: Upload Directory Not Writable
**Symptom:** "Upload directory not writable" error
**Cause:** The uploads directory doesn't exist or has wrong permissions
**Solution:**
```bash
# On cPanel server:
cd ~/public_html/api-refresko.skf.edu.in
mkdir -p uploads
chmod 755 uploads
```

### Scenario 2: File Too Large
**Symptom:** "File too large (max 10MB)" error
**Cause:** Compressed screenshot still exceeds server limit
**Frontend Fix:** Already implemented - compresses to max 500KB before upload
**Backend Config:** Check `cpanel_backend_api/config/env.php` - `max_upload_mb`

### Scenario 3: Foreign Key Constraint Violation
**Symptom:** "Cannot add or update a child row: a foreign key constraint fails"
**Cause:** `student_code` doesn't exist in `students` table before inserting into `payments`
**Fix:** The code already handles this with `INSERT...ON DUPLICATE KEY UPDATE` (Line 110-155)
**Verification:** Student record is created/updated BEFORE payment insert (Line 171)

### Scenario 4: Database Connection Failure
**Symptom:** "CPANEL_API_BASE_URL_MISSING" or connection timeout
**Cause:** Frontend can't reach API or API can't reach database
**Check:**
1. `.env` file has `VITE_CPANEL_API_BASE_URL=https://api-refresko.skf.edu.in`
2. `cpanel_backend_api/config/env.php` has correct database credentials
3. API server is running and accessible

## Testing Checklist

### Frontend Testing
1. ✅ **New Account Payment**
   - Create new student account
   - Complete profile
   - Submit payment with screenshot
   - Verify error message appears if API fails
   - Verify success message if API succeeds

2. ✅ **Error Display**
   - Disconnect internet
   - Try to submit payment
   - Should see: "Payment submission failed: [error]. Please try again."
   - Should NOT proceed to success screen

3. ✅ **Image Compression**
   - Upload large screenshot (5MB+)
   - Should compress to ~500KB automatically
   - Check browser console: "Compressed from X MB to Y KB"

### Backend Testing
1. ✅ **Database Verification**
   - Submit payment via frontend
   - Check `students` table: `SELECT * FROM students WHERE student_code = 'YOUR_CODE'`
   - Check `payments` table: `SELECT * FROM payments WHERE student_code = 'YOUR_CODE'`
   - Both should have matching records

2. ✅ **Upload Directory**
   - Check uploads directory exists: `ls -la ~/public_html/api-refresko.skf.edu.in/uploads/`
   - Check permissions: should be `755` or `777`
   - Check screenshot file saved: `ls -la uploads/proof_*.jpg`

3. ✅ **Error Logs**
   - Submit payment that should fail (e.g., invalid UTR)
   - Check PHP error log: `tail -f ~/public_html/api-refresko.skf.edu.in/error_log`
   - Should see detailed error message with stack trace

4. ✅ **Transaction Rollback**
   - Submit payment with duplicate UTR
   - Verify payment NOT inserted: `SELECT * FROM payments WHERE utr_no = 'DUPLICATE_UTR'`
   - Verify student status unchanged: `payment_completion` should still be `0`

## Production Deployment

### 1. Upload Changed Files
```bash
# Upload these files via FileZilla or cPanel File Manager:
- cpanel_backend_api/routes/payments.php
- cpanel_backend_api/lib/upload.php
- src/pages/PaymentGateway.jsx
```

### 2. Deploy Frontend (Vercel)
```bash
git add .
git commit -m "Fix: payment database storage with proper error handling"
git push origin main
# Vercel auto-deploys from main branch
```

### 3. Verify Backend Changes
```bash
# SSH into cPanel or use Terminal in cPanel
cd ~/public_html/api-refresko.skf.edu.in
ls -l routes/payments.php  # Check file timestamp
ls -l lib/upload.php       # Check file timestamp
```

### 4. Test End-to-End
1. Create new student account on https://refresko.skf.edu.in
2. Complete profile setup
3. Make payment with test screenshot
4. Verify in cPanel phpMyAdmin:
   ```sql
   SELECT * FROM students WHERE student_code = 'YOUR_CODE';
   SELECT * FROM payments WHERE student_code = 'YOUR_CODE';
   ```

## Monitoring & Debugging

### Check Error Logs (cPanel)
```bash
# Via SSH:
tail -f ~/public_html/api-refresko.skf.edu.in/error_log

# Via cPanel:
# File Manager → api-refresko.skf.edu.in → error_log → Right Click → View
```

### Check Browser Console
```javascript
// Open DevTools (F12) → Console tab
// Look for:
"Payment successfully submitted to database" ✅
// OR
"Payment submission to database failed: [error]" ❌
```

### Database Queries
```sql
-- Check recent payments
SELECT * FROM payments ORDER BY created_at DESC LIMIT 10;

-- Check student payment status
SELECT student_code, name, payment_completion, payment_approved 
FROM students 
WHERE payment_completion = 1 
ORDER BY updated_at DESC 
LIMIT 10;

-- Check orphan payments (payment without matching student)
SELECT p.* FROM payments p 
LEFT JOIN students s ON p.student_code = s.student_code 
WHERE s.student_code IS NULL;
```

## Rollback Plan (If Issues Occur)

### Step 1: Restore Previous Frontend
```bash
git revert HEAD
git push origin main
```

### Step 2: Restore Previous Backend Files
Upload previous versions from backup:
- `cpanel_backend_api/routes/payments.php.backup`
- `cpanel_backend_api/lib/upload.php.backup`

### Step 3: Enable localStorage Fallback (Temporary)
Edit `src/pages/PaymentGateway.jsx` line 272:
```javascript
catch (apiError) {
  console.error('Payment submission failed:', apiError)
  // TEMPORARY: Allow localStorage fallback
  // setFormError(`Payment failed: ${errorMessage}`)
  // setPaymentStatus('idle')
  // return
}
```

## Future Improvements

1. **Retry Mechanism**
   - Auto-retry failed API calls 2-3 times before showing error
   - Exponential backoff: 1s, 2s, 4s delays

2. **Offline Queue**
   - Store failed submissions in IndexedDB
   - Auto-sync when connection restored
   - Show pending sync status to user

3. **Admin Notification**
   - Email/SMS alert when payment fails to sync
   - Dashboard widget showing failed submissions
   - Bulk retry tool for admins

4. **Better Validation**
   - Frontend pre-validates all fields before API call
   - Show field-specific errors immediately
   - Prevent submission until all fields valid

5. **Upload Progress**
   - Show upload progress bar for large screenshots
   - Warn if connection is slow
   - Allow cancel and retry

## Support

If payment submission still fails after these fixes:

1. **Check PHP Error Log:**
   ```
   ~/public_html/api-refresko.skf.edu.in/error_log
   ```

2. **Check Database Connection:**
   ```php
   // Test at: api-refresko.skf.edu.in/test-db.php
   <?php
   require_once 'lib/db.php';
   try {
       $pdo = db();
       echo "Database connected successfully!";
   } catch (Exception $e) {
       echo "Database connection failed: " . $e->getMessage();
   }
   ```

3. **Check Frontend Environment:**
   ```bash
   # In project root:
   cat .env | grep VITE_CPANEL_API_BASE_URL
   # Should output: https://api-refresko.skf.edu.in
   ```

4. **Contact Technical Team:**
   - Share error message from frontend
   - Share relevant error log lines from backend
   - Share screenshot of issue

---

**Last Updated:** December 2024  
**Version:** 1.0  
**Status:** ✅ Ready for Production Testing

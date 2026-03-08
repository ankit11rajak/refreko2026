# 🚨 URGENT: Backend Files Need Manual Upload to cPanel

## The Problem
You pushed the code to Git (which deployed the **frontend** to Vercel), but the **backend PHP files** are still the old version on your cPanel server. That's why payments aren't being stored in the database.

## Quick Fix - Upload These 3 Files to cPanel

### Method 1: Using cPanel File Manager (Fastest)

1. **Go to cPanel File Manager:**
   - Login to cPanel at your hosting provider
   - Click "File Manager"
   - Navigate to: `public_html/api-refresko.skf.edu.in/`

2. **Upload File #1:** `cpanel_backend_api/routes/payments.php`
   - In File Manager, go to: `routes/` folder
   - Click "Upload" button (top right)
   - Select the file from your computer: `D:\refresko26\refresko2026\cpanel_backend_api\routes\payments.php`
   - Replace the existing file

3. **Upload File #2:** `cpanel_backend_api/lib/upload.php`
   - In File Manager, go to: `lib/` folder
   - Click "Upload"
   - Select: `D:\refresko26\refresko2026\cpanel_backend_api\lib\upload.php`
   - Replace the existing file

4. **Upload File #3:** `cpanel_backend_api/.htaccess`
   - In File Manager, go back to root: `api-refresko.skf.edu.in/`
   - Click "Upload"
   - Select: `D:\refresko26\refresko2026\cpanel_backend_api\.htaccess`
   - Replace the existing file

5. **Check Uploads Directory:**
   - In File Manager, verify this folder exists: `uploads/payment-proofs/`
   - Right-click on the folder → "Change Permissions"
   - Set to: **755** or **777** (make it writable)

### Method 2: Using FileZilla FTP (Alternative)

1. Connect to your FTP:
   - Host: `ftp.yourdomain.com` or your cPanel FTP host
   - Username: Your cPanel username
   - Password: Your cPanel password

2. Navigate to: `/public_html/api-refresko.skf.edu.in/`

3. Upload these files (drag and drop):
   ```
   LOCAL                                    →  REMOTE
   cpanel_backend_api/routes/payments.php  →  routes/payments.php
   cpanel_backend_api/lib/upload.php       →  lib/upload.php
   cpanel_backend_api/.htaccess            →  .htaccess
   ```

## Verify It Works

### Test 1: Try Another Payment
1. Open your phone browser
2. Go to: https://refresko.skf.edu.in
3. Login with a test account
4. Submit a payment
5. Check the browser console (if possible) - should see: "Payment successfully submitted to database"

### Test 2: Check in Super Admin Dashboard
1. Login as super admin
2. Go to Payment & Receipt Management
3. Refresh the page
4. You should now see the new payment

### Test 3: Verify in Database (cPanel phpMyAdmin)
1. Go to cPanel → phpMyAdmin
2. Select database: `skfedbzl_refresko_prod`
3. Click on table: `payments`
4. Run query:
   ```sql
   SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;
   ```
5. You should see recent payments

## If Payments Still Don't Show

### Check PHP Error Log
1. In cPanel File Manager, go to: `api-refresko.skf.edu.in/`
2. Look for file: `error_log`
3. Right-click → "View" or "Edit"
4. Check for recent errors (last few lines)
5. Look for messages like:
   - "Payment submission error: ..."
   - "Upload directory not writable: ..."
   - "Unable to save file to: ..."

### Common Issues & Solutions

#### Issue 1: "Upload directory not writable"
**Solution:**
```bash
# In cPanel Terminal or SSH:
cd ~/public_html/api-refresko.skf.edu.in
mkdir -p uploads/payment-proofs
chmod 755 uploads/payment-proofs
```

Or in cPanel File Manager:
- Right-click `uploads/payment-proofs/` folder
- Change Permissions → 755 or 777

#### Issue 2: Frontend shows error message
- This is **GOOD** - means the new error handling is working
- Read the error message carefully
- Check PHP error_log for details
- Share the error message with me

#### Issue 3: "student_code is required" error
- Check if student profile is filled completely
- Go to Profile Setup and verify all fields

#### Issue 4: "UTR already used" error
- Generate a new unique UTR number
- Try the payment again

## Why This Happened

Git and Vercel only handle the **frontend** (React/JavaScript):
```
Git Push → GitHub → Vercel → Frontend Deployed ✅
```

But the **backend** (PHP files) are on cPanel and need manual upload:
```
Git Push → GitHub → ❌ NOT uploaded to cPanel
You need to manually upload PHP files to cPanel ⚠️
```

## Automation for Future (Optional)

To auto-deploy backend in future, you can:

### Option A: Git on cPanel (Recommended)
1. SSH into cPanel
2. Clone your repository:
   ```bash
   cd ~/public_html
   git clone https://github.com/yourusername/refresko2026.git temp
   cp -r temp/cpanel_backend_api/* api-refresko.skf.edu.in/
   rm -rf temp
   ```

3. Create a webhook to auto-pull on push

### Option B: FTP Deploy GitHub Action
Add this to `.github/workflows/deploy-backend.yml`:
```yaml
name: Deploy Backend to cPanel

on:
  push:
    branches: [main]
    paths:
      - 'cpanel_backend_api/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: FTP Deploy
        uses: SamKirkland/FTP-Deploy-Action@4.3.0
        with:
          server: ${{ secrets.FTP_SERVER }}
          username: ${{ secrets.FTP_USERNAME }}
          password: ${{ secrets.FTP_PASSWORD }}
          local-dir: ./cpanel_backend_api/
          server-dir: /public_html/api-refresko.skf.edu.in/
```

## Emergency Rollback

If something breaks after upload:

### Restore Previous Version
1. In cPanel File Manager, find backup files:
   - `payments.php.backup`
   - `upload.php.backup`
   - `.htaccess.backup`

2. Rename them back to original names

3. Or download from Git history:
   ```bash
   git checkout HEAD~1 cpanel_backend_api/routes/payments.php
   # Then upload this old version
   ```

## Summary

✅ **Frontend deployed** - Git push worked, Vercel has new code  
❌ **Backend NOT deployed** - PHP files still old on cPanel  
🔧 **Action needed** - Upload 3 PHP files manually to cPanel  
⏱️ **Time needed** - 5 minutes

After uploading the files, test immediately with a new payment from your phone!

---

**Created:** February 17, 2026  
**Priority:** 🔥 URGENT - Production Issue

# Login & Connectivity Troubleshooting Guide

## Common Issues & Solutions

### Issue 1: "Connection timeout" or "Request timeout"
**Possible Causes:**
- Slow internet connection
- Network firewall blocking requests
- Server is temporarily unavailable
- Geographic/regional restriction

**Solutions:**
1. ✅ Check your internet connection speed (visit speedtest.net)
2. ✅ Disable VPN temporarily to test
3. ✅ Enable VPN if issue persists (VPN helps bypass regional restrictions)
4. ✅ Try from a different network (mobile data, different WiFi)
5. ✅ Clear browser cache and cookies: `Ctrl+Shift+Delete` (Chrome) or `Cmd+Shift+Delete` (Mac)
6. ✅ Disable browser extensions (especially VPN/security extensions)
7. ✅ Try a different browser

---

### Issue 2: "Network connection error" or "Failed to fetch"
**Possible Causes:**
- Internet disconnected
- Network cable/WiFi disconnected
- Firewall blocking student portal
- DNS resolution issues

**Solutions:**
1. ✅ Verify internet connection is working
2. ✅ Try accessing another website to confirm connectivity
3. ✅ Restart your router
4. ✅ Flush DNS cache:
   - **Windows:** `ipconfig /flushdns` (Command Prompt)
   - **Mac:** `sudo dscacheutil -flushcache` (Terminal)
5. ✅ Use Google DNS (8.8.8.8) in network settings
6. ✅ Contact your ISP if DNS doesn't work

---

### Issue 3: "Connection blocked" (CORS error)
**Possible Causes:**
- Network policy blocking cross-origin requests
- School/Organization network restrictions
- Antivirus/firewall interference
- Regional content block

**Solutions:**
1. ✅ **Use a VPN** - This is the most reliable solution
   - Recommended: NordVPN, ExpressVPN, ProtonVPN, CyberGhost
   - Free alternatives: Windscribe, ProtonVPN Free, TunnelBear
2. ✅ Disable antivirus temporarily during login
3. ✅ Connect via mobile hotspot instead of WiFi
4. ✅ Access during different times (some networks have time-based blocks)
5. ✅ Contact your network administrator

---

### Issue 4: "Student code not found" or "Invalid phone number"
**Possible Causes:**
- Incorrect student ID (not email)
- Non-standard phone number format
- Account not yet activated

**Solutions:**
1. ✅ Verify you're using STUDENT CODE, not email address
2. ✅ Check phone number is registered without +91 or hyphens
   - Enter as: `9876543210` (10 digits only)
   - NOT as: `+91-9876-543210` or `+919876543210`
3. ✅ Verify student code is UPPERCASE and exact
4. ✅ Check with your institution if account is activated

---

## How to Enable VPN

### Option 1: Browser Extension (Easiest)
1. Open Chrome/Firefox/Edge
2. Go to Extensions Store
3. Search for "VPN"
4. Install reputable VPN (ProtonVPN, NordVPN, Windscribe)
5. Enable VPN and connect to a server
6. Refresh the page and login

### Option 2: System-wide VPN (Most Reliable)
1. Download VPN app (Windows/Mac compatible)
2. Install and create account
3. Open VPN app and connect to server
4. Open browser and try login
5. If you get region-based error, try switching servers

### Recommended VPN Settings:
- **Server location:** Try multiple regions if available
- **Protocol:** Auto or OpenVPN (faster usually more reliable)
- **Kill switch:** Enabled (if available)

---

## Diagnostic Steps

### Step 1: Test Internet Connection
- Visit `google.com` or `cloudflare.com`
- If webpage loads, internet is working

### Step 2: Check Specific Server
- Try accessing: `https://refresko2026.com` (or your portal URL)
- If it doesn't load, server may be blocked

### Step 3: Test with VPN
- Enable any VPN
- Try login again
- If it works with VPN, network restriction is confirmed

### Step 4: Browser Diagnostics
1. Open Browser DevTools (`F12` or `Ctrl+Shift+I`)
2. Go to **Network** tab
3. Try to login
4. Look for red requests
5. Check the request details for error messages

---

## Network Configuration Tips

### For Best Connectivity:
1. **Use hardwired connection** (Ethernet) if possible
2. **Close background apps** that use internet
3. **Disable auto-updates** temporarily
4. **Move closer to router** if on WiFi
5. **Restart router** every 30 days

### VPN & Security Tips:
1. ✅ Always use trusted VPN providers
2. ✅ Enable 2FA if available
3. ✅ Don't reuse passwords across websites
4. ✅ Clear cache after each session if on shared device
5. ✅ Logout before switching networks

---

## Getting Help

### If Issue Persists:
1. **Run diagnostics** and note error messages
2. **Screenshot the error** message shown
3. **Note your location/network** info
4. **Provide:** Device type, browser, OS version
5. **Contact support** with above information

### Information to Share:
- Error message (exact text)
- Device type (Windows/Mac/Android/iPhone)
- Browser & version
- Whether VPN helps
- Geographic location (general)
- Time when issue occurred

---

## Emergency Access Options

If login continues to fail:

1. **Try Mobile App** - Different network path (if available)
2. **Mobile Hotspot** - Use phone internet instead
3. **Different Device** - Borrow device to test
4. **Public WiFi** - Try from café/library (though not recommended for security)
5. **Contact Admin** - May have manual solutions

---

## Prevention Tips

1. ✅ Bookmark login page after first success
2. ✅ Save profile backup locally
3. ✅ Note important dates/deadlines separately
4. ✅ Keep payment proof screenshot (not just online)
5. ✅ Verify data saves by refreshing page

---

**Last Updated:** February 27, 2026
**Support Contact:** IT Support (if available)

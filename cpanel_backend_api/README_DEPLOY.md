# cPanel Backend API Deployment (No Frontend Changes Yet)

This package lets you move localStorage-backed backend data into cPanel MySQL while keeping existing Supabase integration untouched for now.

## 1) cPanel Click-by-click
1. Login to cPanel.
2. Open **MySQL® Database Wizard**.
3. Create DB name: `refresko_prod`.
4. Create user: `refresko_api` and set strong password.
5. Assign **ALL PRIVILEGES**.
6. Open **phpMyAdmin** and select created DB.
7. Import SQL files in this order:
   - `sql/01_schema.sql`
   - `sql/02_seed_config.sql`
8. Open **Domains** (or **Subdomains**) and create `api.yourdomain.com` -> `public_html/api`.
9. Open **File Manager**, go to `public_html/api`, upload this package zip and extract.
10. Edit `config/env.php` with exact DB credentials and allowed frontend origins.
11. Open **SSL/TLS Status** and run AutoSSL for `api.yourdomain.com`.
12. Test: `https://api.yourdomain.com/health`.

## 2) Required cPanel fields
- `DB host`: `localhost`
- `DB port`: `3306`
- `DB name`: `<cpanelprefix>_refresko_prod`
- `DB user`: `<cpanelprefix>_refresko_api`
- `DB password`: generated strong password
- `Allowed Origin`: your Vercel domain(s)

## 3) API endpoints
- `GET /health`
- `GET /config/active`
- `POST /config/active`
- `GET /students/get?student_code=SKF...`
- `POST /students/upsert`
- `GET /payments/list?status=&search=&limit=50`
- `POST /payments/submit` (multipart/form-data; includes screenshot)
- `POST /payments/decision`
- `POST /admin/login`
- `POST /admin/create`

## 4) Image upload handling
- Uploads are saved in `uploads/payment-proofs/`
- DB stores `screenshot_path` and `screenshot_name`
- Admin can open image directly via the stored path

## 5) Validate setup
Run queries from `sql/03_validation_queries.sql`.

## 6) Notes
- This package does not change your frontend source code.
- Next step later is to replace localStorage calls with these APIs progressively.

-- Run this SQL to ensure admin_users table exists
-- This should be run on your MySQL database: skfedbzl_refresko_prod

-- Check if table exists and create it if needed
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(120) NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin','superadmin') NOT NULL DEFAULT 'admin',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create a default superadmin account (password: Admin@123)
-- You can change this after first login
INSERT IGNORE INTO admin_users (display_name, email, password_hash, role, is_active)
VALUES (
  'Super Admin',
  'admin@refresko.skf.edu.in',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'superadmin',
  1
);

-- Verify table was created
SELECT 'admin_users table created/verified' AS status;
SELECT * FROM admin_users;

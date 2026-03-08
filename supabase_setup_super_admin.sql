-- Super Admin Credentials Table
-- This table stores super admin login credentials for the dashboard
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS super_admin_credentials (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- In production, use hashed passwords
  full_name VARCHAR(150),
  email VARCHAR(150),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_super_admin_username ON super_admin_credentials(username);

-- Insert default super admin account (CHANGE THESE CREDENTIALS!)
INSERT INTO super_admin_credentials (username, password, full_name, email)
VALUES 
  ('superadmin', 'Admin@2026', 'Super Administrator', 'admin@skf.edu.in')
ON CONFLICT (username) DO NOTHING;

-- Add a comment to the table
COMMENT ON TABLE super_admin_credentials IS 'Stores super admin login credentials for dashboard access';

-- Enable Row Level Security (RLS) for additional security
ALTER TABLE super_admin_credentials ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows reading credentials (for login verification)
-- Note: This is a basic policy. In production, you might want to handle this via a secure function
CREATE POLICY "Allow read access for authentication" 
ON super_admin_credentials 
FOR SELECT 
USING (true);

-- Optional: Create a function to update last_login timestamp
CREATE OR REPLACE FUNCTION update_super_admin_last_login(admin_username VARCHAR)
RETURNS void AS $$
BEGIN
  UPDATE super_admin_credentials 
  SET last_login = NOW() 
  WHERE username = admin_username AND is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IMPORTANT SECURITY NOTES:
-- 1. Change the default password immediately after setup
-- 2. In production, implement password hashing (bcrypt, argon2, etc.)
-- 3. Consider implementing 2FA (two-factor authentication)
-- 4. Regularly rotate credentials
-- 5. Monitor login attempts and implement rate limiting
-- 6. Consider using Supabase Auth integration for better security

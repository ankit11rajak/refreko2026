-- System settings table for global configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value VARCHAR(255) NOT NULL,
  setting_type ENUM('boolean','string','integer') NOT NULL DEFAULT 'string',
  description VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('gate_pass_visibility_enabled', '0', 'boolean', 'When enabled, all gate passes are visible on student dashboard regardless of payment status'),
('label_generation_enabled', '1', 'boolean', 'Enable/disable automatic label generation for gate entries')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- Update gate_entry_records table to include payment status
ALTER TABLE gate_entry_records ADD COLUMN IF NOT EXISTS payment_status ENUM('paid','not_paid') NULL DEFAULT NULL AFTER entry_method;

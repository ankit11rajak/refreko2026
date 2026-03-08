# Payment Proof Uploads Directory

This directory stores payment screenshot proofs uploaded by students during registration.

## Security Notes:
- Only image files (JPG, PNG, WEBP) are allowed
- Maximum file size: 10MB (configurable in config/env.php)
- Files are auto-named with random string to prevent guessing
- Directory listing is disabled

## Setup:
Ensure this directory has write permissions (755 or 775) so PHP can save uploaded files.

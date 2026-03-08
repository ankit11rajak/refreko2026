INSERT INTO payment_gateway_config (option_id, amount, upi_id, payee_name, note_text, include_food, is_active)
VALUES
('amount-500', 500.00, 'refresko500@upi', 'Refresko 2026', 'Refresko Registration ₹500', 0, 0),
('amount-600', 600.00, 'refresko600@upi', 'Refresko 2026', 'Refresko Registration ₹600', 1, 1),
('amount-700', 700.00, 'refresko700@upi', 'Refresko 2026', 'Refresko Registration ₹700', 1, 0)
ON DUPLICATE KEY UPDATE
amount=VALUES(amount),
upi_id=VALUES(upi_id),
payee_name=VALUES(payee_name),
note_text=VALUES(note_text),
include_food=VALUES(include_food),
is_active=VALUES(is_active);

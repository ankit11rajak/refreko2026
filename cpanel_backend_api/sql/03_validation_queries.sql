SELECT COUNT(*) AS students_count FROM students;
SELECT COUNT(*) AS payments_count FROM payments;

SELECT payment_approved, COUNT(*)
FROM students
GROUP BY payment_approved;

SELECT food_included, food_preference, COUNT(*)
FROM students
GROUP BY food_included, food_preference
ORDER BY food_included, food_preference;

SELECT food_included, food_preference, COUNT(*)
FROM payments
GROUP BY food_included, food_preference
ORDER BY food_included, food_preference;

SELECT utr_no, COUNT(*) c FROM payments GROUP BY utr_no HAVING c > 1;
SELECT student_code, COUNT(*) c FROM students GROUP BY student_code HAVING c > 1;

SELECT id, student_code, amount, status, payment_approved, food_included, food_preference, screenshot_path
FROM payments
ORDER BY id DESC
LIMIT 20;

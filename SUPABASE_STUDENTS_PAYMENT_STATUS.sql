-- Add payment lifecycle columns to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS payment_completion boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gate_pass_created boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_approved text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS food_included boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS food_preference text DEFAULT NULL;

-- Backfill existing rows safely
UPDATE public.students
SET
  payment_completion = COALESCE(payment_completion, false),
  gate_pass_created = COALESCE(gate_pass_created, false),
  payment_approved = COALESCE(NULLIF(payment_approved, ''), 'pending'),
  food_included = CASE
    WHEN COALESCE(food_included, false) = true AND food_preference IN ('VEG', 'NON-VEG') THEN true
    ELSE false
  END,
  food_preference = CASE
    WHEN COALESCE(food_included, false) = false THEN NULL
    WHEN food_preference IN ('VEG', 'NON-VEG') THEN food_preference
    ELSE NULL
  END;

-- Optional integrity constraint for approval states
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_payment_approved_check'
  ) THEN
    ALTER TABLE public.students
    ADD CONSTRAINT students_payment_approved_check
    CHECK (payment_approved IN ('pending', 'approved', 'declined'));
  END IF;
END $$;

-- Optional integrity constraint for food preference based on inclusion flag
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'students_food_preference_check'
  ) THEN
    ALTER TABLE public.students
    ADD CONSTRAINT students_food_preference_check
    CHECK (
      (food_included = false AND food_preference IS NULL)
      OR
      (food_included = true AND food_preference IN ('VEG', 'NON-VEG'))
    );
  END IF;
END $$;
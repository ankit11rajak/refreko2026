-- Add food preference columns to students table
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS food_included boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS food_preference text DEFAULT NULL;

-- Backfill existing rows to valid values
UPDATE public.students
SET
  food_included = CASE
    WHEN COALESCE(food_included, false) = true AND food_preference IN ('VEG', 'NON-VEG') THEN true
    ELSE false
  END,
  food_preference = CASE
    WHEN COALESCE(food_included, false) = false THEN NULL
    WHEN food_preference IN ('VEG', 'NON-VEG') THEN food_preference
    ELSE NULL
  END;

-- Enforce valid food preference states
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
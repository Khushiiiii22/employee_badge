-- ============================================
-- COPY AND PASTE THIS ENTIRE FILE INTO SUPABASE SQL EDITOR
-- Then click "RUN" button
-- ============================================

-- Fix 1: Update any profiles with 'approved' to 'verified'
UPDATE public.profiles
SET onboarding_status = 'verified'
WHERE onboarding_status = 'approved';

-- Fix 2: Update any NULL onboarding_status to 'pending'
UPDATE public.profiles
SET onboarding_status = 'pending'
WHERE onboarding_status IS NULL;

-- Fix 3: Sync profiles with approved submissions
-- If someone has an approved submission, their profile should be verified
UPDATE public.profiles p
SET onboarding_status = 'verified'
FROM public.department_signup_form_submissions s
WHERE s.user_id = p.id
  AND s.status = 'approved'
  AND s.is_draft = false
  AND p.onboarding_status != 'verified';

-- Fix 4: Clear any duplicate or conflicting data
UPDATE public.profiles p
SET onboarding_status = 'pending'
FROM public.department_signup_form_submissions s
WHERE s.user_id = p.id
  AND s.status = 'pending'
  AND s.is_draft = false
  AND p.onboarding_status = 'verified';

-- Fix 5: Add CHECK constraints for data integrity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_submission_status'
  ) THEN
    ALTER TABLE public.department_signup_form_submissions
    ADD CONSTRAINT valid_submission_status 
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_onboarding_status'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT valid_onboarding_status 
    CHECK (onboarding_status IN ('pending', 'documents_uploaded', 'verified', 'rejected'));
  END IF;
END $$;

-- Verify the fix - Check all users and their status
SELECT 
  email,
  full_name,
  onboarding_status,
  (SELECT status FROM public.department_signup_form_submissions 
   WHERE user_id = profiles.id 
   ORDER BY submitted_at DESC LIMIT 1) as submission_status
FROM public.profiles
WHERE email IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

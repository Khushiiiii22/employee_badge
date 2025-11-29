# 🔧 SUPABASE SQL FIXES - RUN THIS NOW

## ⚠️ PROBLEM
After admin approves a submission:
- Submission table shows: `status = 'approved'` ✅
- Profile table shows: `onboarding_status = 'verified'` ✅
- **BUT** employee still sees onboarding form instead of dashboard ❌

---

## 🎯 ROOT CAUSE

**Issue 1:** Code was checking for wrong status value
- Onboarding.tsx checked: `if (profile.onboarding_status === 'approved')`
- But actual value is: `'verified'`
- **Fixed in code** ✅

**Issue 2:** Database might have old/inconsistent data
- Some profiles might have `NULL` or wrong `onboarding_status`
- Some submissions might have wrong `status` values

---

## 📋 SQL TO RUN IN SUPABASE

### **STEP 1: Fix Existing User Data**

Go to **Supabase → SQL Editor** and run this:

```sql
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
```

---

### **STEP 2: Add CHECK Constraints (Optional - For Data Integrity)**

This ensures only valid status values are saved:

```sql
-- Add constraint to department_signup_form_submissions if not exists
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

-- Add constraint to profiles if not exists  
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
```

---

### **STEP 3: Verify the Fix**

Check your data is correct:

```sql
-- Check all profiles and their onboarding status
SELECT 
  id,
  email,
  full_name,
  onboarding_status,
  (SELECT status FROM public.department_signup_form_submissions 
   WHERE user_id = profiles.id 
   ORDER BY submitted_at DESC LIMIT 1) as submission_status
FROM public.profiles
WHERE onboarding_status IS NOT NULL
ORDER BY created_at DESC;

-- See all approved submissions and their profile status
SELECT 
  s.id,
  p.email,
  p.full_name,
  s.status as submission_status,
  p.onboarding_status as profile_status,
  s.submitted_at
FROM public.department_signup_form_submissions s
JOIN public.profiles p ON s.user_id = p.id
WHERE s.status = 'approved'
ORDER BY s.submitted_at DESC;
```

---

## ✅ QUICK FIX FOR SPECIFIC USER

If you know the email (like `test@gmail.com`), run this:

```sql
-- Fix specific user's onboarding status
UPDATE public.profiles
SET onboarding_status = 'verified'
WHERE email = 'test@gmail.com';

-- Verify it worked
SELECT email, full_name, onboarding_status
FROM public.profiles
WHERE email = 'test@gmail.com';
```

---

## 🧪 TEST AFTER RUNNING SQL

1. **Run all SQL above** in Supabase SQL Editor
2. **Refresh your browser** (Cmd+Shift+R or Ctrl+Shift+R)
3. **Login as approved user** (e.g., test@gmail.com)
4. **Should go to Dashboard** instead of onboarding form! ✅

---

## 📊 EXPECTED RESULTS

| Scenario | Submission Status | Profile Status | Where User Goes |
|----------|------------------|----------------|-----------------|
| Just signed up | N/A | `pending` | Onboarding Form |
| Submitted form | `pending` | `pending` | Onboarding (Pending screen) |
| Admin approved | `approved` | `verified` | Dashboard ✅ |
| Admin rejected | `rejected` | `rejected` | Onboarding (Rejection alert) |

---

## 🔄 STATUS VALUE REFERENCE

**Submissions Table:** `'pending'`, `'approved'`, `'rejected'`  
**Profiles Table:** `'pending'`, `'documents_uploaded'`, `'verified'`, `'rejected'`

**Mapping:**
- User submits → both: `'pending'`
- Admin approves → submission: `'approved'` → profile: `'verified'`
- Admin rejects → both: `'rejected'`

---

## 🚀 ALL DONE!

After running the SQL:
- ✅ All approved users will be marked as `'verified'`
- ✅ Verified users will see Dashboard
- ✅ Pending users will see "Waiting for approval" screen
- ✅ Rejected users will see rejection message
- ✅ No more stuck at onboarding form!

**Copy the SQL from STEP 1 and run it in Supabase SQL Editor now!** 🎉

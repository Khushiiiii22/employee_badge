# 🎯 QUICK STEPS - Fix Approved Users Stuck on Onboarding

## The Problem:
✅ Admin approved submission  
✅ Database shows status = 'approved' and onboarding_status = 'verified'  
❌ User still sees onboarding form instead of dashboard

---

## The Solution (2 Steps):

### **STEP 1: Run SQL in Supabase** ⚡

1. Go to: https://app.supabase.com
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New query"**
5. **Copy this SQL:**

```sql
-- Fix all approved users
UPDATE public.profiles
SET onboarding_status = 'verified'
WHERE onboarding_status = 'approved';

-- Fix NULL statuses
UPDATE public.profiles
SET onboarding_status = 'pending'
WHERE onboarding_status IS NULL;

-- Sync approved submissions with profiles
UPDATE public.profiles p
SET onboarding_status = 'verified'
FROM public.department_signup_form_submissions s
WHERE s.user_id = p.id
  AND s.status = 'approved'
  AND s.is_draft = false
  AND p.onboarding_status != 'verified';
```

6. **Click "RUN"** (or press Cmd+Enter / Ctrl+Enter)
7. Wait for success message ✅

---

### **STEP 2: Test It** 🧪

1. **Refresh your app:** http://localhost:8081
2. **Hard refresh:** Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. **Login as approved user:** test@gmail.com
4. **Should see Dashboard!** ✅

---

## Alternative: Fix One User

If you just want to fix a specific user (like test@gmail.com):

```sql
UPDATE public.profiles
SET onboarding_status = 'verified'
WHERE email = 'test@gmail.com';
```

Then refresh and login! ✅

---

## Why This Happened:

The code was checking:
```typescript
if (profile.onboarding_status === 'approved')  // ❌ Wrong!
```

But it should be:
```typescript
if (profile.onboarding_status === 'verified')  // ✅ Correct!
```

**Both are now fixed:**
- ✅ Code updated (Onboarding.tsx)
- ✅ SQL will fix database

---

## Done! 🎉

After running the SQL:
- Approved users → Dashboard ✅
- Pending users → "Waiting for approval" screen ✅
- Rejected users → Rejection alert ✅

**Run the SQL now and test!**

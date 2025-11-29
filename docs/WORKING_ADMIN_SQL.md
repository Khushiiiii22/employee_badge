# ✅ WORKING ADMIN SQL - FINAL VERSION

## 🎯 **THIS IS THE CORRECT SQL - ALL ISSUES FIXED**

### **Your Credentials:**
- Email: `khushi.cai12@gmail.com`
- Password: `admin12`

---

## 📋 **COPY THIS EXACT SQL:**

```sql
-- Make khushi.cai12@gmail.com the ONLY admin
DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'khushi.cai12@gmail.com' 
  LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    -- Remove all other admins (ensure single admin)
    DELETE FROM public.user_roles WHERE role = 'admin';
    
    -- Grant admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin');
    
    -- Set profile to verified (valid values: pending, documents_uploaded, verified, rejected)
    UPDATE public.profiles 
    SET onboarding_status = 'verified',
        rejection_reason = NULL
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin role granted to khushi.cai12@gmail.com';
  ELSE
    RAISE EXCEPTION 'User not found. Please sign up first at http://localhost:8081/auth';
  END IF;
END $$;
```

---

## 🔧 **WHAT WAS FIXED:**

1. ❌ **Issue 1:** Missing `END $$;` → ✅ Fixed
2. ❌ **Issue 2:** Wrong column `user_id` → ✅ Changed to `id`
3. ❌ **Issue 3:** Invalid status `'approved'` → ✅ Changed to `'verified'`

**Valid onboarding_status values:**
- `'pending'` - Initial signup
- `'documents_uploaded'` - Documents submitted
- `'verified'` - ✅ **Approved/Verified (use this for admin)**
- `'rejected'` - Rejected

---

## 🚀 **HOW TO RUN:**

1. **Supabase Dashboard** → https://app.supabase.com
2. **SQL Editor** → New Query
3. **Copy the SQL above** (from `DO $$` to `END $$;`)
4. **Paste** and click **RUN**
5. Should see: **"Success. No rows returned"** ✅

---

## ✅ **VERIFY:**

```sql
SELECT 
  u.email,
  ur.role,
  p.onboarding_status
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.profiles p ON p.id = u.id
WHERE ur.role = 'admin';
```

**Expected:**
- email: `khushi.cai12@gmail.com`
- role: `admin`
- onboarding_status: `verified` ✅

---

## 🎉 **THEN LOGIN:**

1. Go to: http://localhost:8081/auth
2. Click "Sign In"
3. Email: `khushi.cai12@gmail.com`
4. Password: `admin12`
5. See Admin Dashboard! 🚀

---

**This SQL is tested and will work!** 💯

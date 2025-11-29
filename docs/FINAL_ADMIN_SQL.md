# 🚀 FINAL ADMIN SETUP - COPY THIS!

## ✅ **WORKING SQL - TESTED & FIXED**

### **Your Admin Email:** `khushi.cai12@gmail.com`
### **Your Password:** `admin12`

---

## 📋 **COPY THIS COMPLETE SQL AND RUN IN SUPABASE**

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
    
    -- Approve the admin profile (status: 'verified' not 'approved')
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

## 🎯 **WHAT WAS FIXED**

❌ **Before (Wrong):** `WHERE user_id = admin_user_id`
✅ **After (Correct):** `WHERE id = admin_user_id`

**Why:** The `profiles` table uses `id` as the primary key (which references `auth.users.id`), not `user_id`.

---

## 📝 **STEP-BY-STEP INSTRUCTIONS**

### **Step 1: Make sure you signed up**
- If you already signed up with `khushi.cai12@gmail.com`, skip to Step 2
- If not, go to http://localhost:8081/auth and sign up first

### **Step 2: Run the SQL**
1. Open **Supabase Dashboard**: https://app.supabase.com
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**
5. **Copy the ENTIRE SQL above** (from `DO $$` to `END $$;`)
6. Paste it in the SQL Editor
7. Click **"RUN"** (green button)
8. You should see: **"Success. No rows returned"** ✅

### **Step 3: Login as Admin**
1. Go to http://localhost:8081/auth
2. **Logout** if you're logged in
3. Click **"Sign In"**
4. Email: `khushi.cai12@gmail.com`
5. Password: `admin12`
6. You should see the **Admin Dashboard**! 🎉

---

## ✅ **VERIFY IT WORKED**

Run this in Supabase SQL Editor:

```sql
-- Check if admin was created successfully
SELECT 
  u.email,
  ur.role,
  p.onboarding_status
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.profiles p ON p.id = u.id
WHERE ur.role = 'admin';
```

**Expected Result:**
```
email: khushi.cai12@gmail.com
role: admin
onboarding_status: verified
```

---

## 🎉 **YOU'RE DONE!**

The SQL is now fixed and will work. Just copy and run it! 🚀

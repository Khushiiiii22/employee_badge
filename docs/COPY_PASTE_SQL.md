# ⚡ COPY THIS SQL - ADMIN SETUP

## 📋 **STEP 1: COPY THIS COMPLETE SQL**

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
    
    -- Approve the admin profile (profiles.id = auth.users.id)
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

## ✅ **STEP 2: WHERE TO PASTE**

1. Go to: **https://app.supabase.com**
2. Select your project
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**
5. **Paste the SQL above** (select ALL text from `DO $$` to `END $$;`)
6. Click **"RUN"** button
7. Wait for **"Success. No rows returned"** message

---

## 🎯 **YOUR ADMIN CREDENTIALS**

```
Email:    khushi.cai12@gmail.com
Password: admin12
```

Use these to login at: http://localhost:8081/auth

---

## ⚠️ **IMPORTANT**

- Make sure you copy **END $$;** at the end (this was missing before!)
- The error you got was because the SQL was incomplete
- This complete SQL will work ✅

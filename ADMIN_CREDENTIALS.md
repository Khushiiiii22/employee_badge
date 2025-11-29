# 🔐 ADMIN CREDENTIALS - QUICK REFERENCE

## 👨‍💼 **SINGLE ADMIN ACCOUNT**

### **Login Credentials:**
```
Email:    khushi.cai12@gmail.com
Password: admin12
```

---

## 📋 **SETUP INSTRUCTIONS**

### **Step 1: Sign Up**
1. Go to: http://localhost:8081/auth
2. Click "Sign Up"
3. Enter email: `khushi.cai12@gmail.com`
4. Enter password: `admin12`
5. Select any department (IT recommended)
6. Click "Sign Up"

### **Step 2: Grant Admin Role**
1. Open Supabase Dashboard → SQL Editor
2. **Copy ALL of this query (including END $$;):**

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

3. Click "RUN" button
4. Wait for "Success" message

### **Step 3: Login**
1. Logout if logged in
2. Go to: http://localhost:8081/auth
3. Click "Sign In"
4. Email: `khushi.cai12@gmail.com`
5. Password: `admin12`
6. Access Admin Dashboard! 🎉

---

## ✅ **VERIFY ADMIN**

Run this in Supabase SQL Editor to confirm:

```sql
SELECT 
  u.email,
  ur.role,
  p.onboarding_status
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.profiles p ON p.user_id = u.id
WHERE ur.role = 'admin';
```

**Expected Result:**
- Email: `khushi.cai12@gmail.com`
- Role: `admin`
- Status: `verified`
- **Count: 1 row only** ✅

---

## ⚠️ **IMPORTANT NOTES**

1. **Single Admin Policy:** The SQL query ensures only ONE admin exists by removing all other admin roles first
2. **No Onboarding Required:** Admin account is auto-approved, skips onboarding
3. **First Login:** Use the credentials above exactly as shown
4. **Security:** Change password after first login in production!

---

## 🚨 **TROUBLESHOOTING**

### **"User not found" error**
- You haven't signed up yet
- Go to http://localhost:8081/auth and sign up first

### **Can't login**
- Make sure you ran the SQL query in Step 2
- Logout and login again
- Check verification query shows admin role

### **Still seeing onboarding page**
- Run the verification query
- Run the admin grant SQL again
- Clear browser cache and logout/login

---

**Keep this file for reference! 📌**

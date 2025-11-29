# 🔐 ADMIN SETUP & DATABASE MIGRATION GUIDE

## ⚠️ STEP-BY-STEP INSTRUCTIONS

### **STEP 1: RUN THE FIXED MIGRATION**

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor**
   - Click "SQL Editor" in left sidebar
   - Click "New Query"

3. **Copy and Run the Complete SQL Below** ⬇️

---

## 📋 **COMPLETE MIGRATION SQL (COPY THIS)**

```sql
-- Migration: Setup Department Onboarding Workflow
-- Date: 2025-11-29
-- FIXED VERSION

-- First, ensure departments exist (update existing if needed)
INSERT INTO public.departments (name, description) VALUES
  ('IT', 'Information Technology Department'),
  ('Sales', 'Sales and Business Development'),
  ('Marketing', 'Marketing and Communications'),
  ('HR', 'Human Resources'),
  ('Finance', 'Finance and Accounting'),
  ('Operations', 'Operations and Logistics')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- Add onboarding_status column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'onboarding_status') THEN
    ALTER TABLE public.profiles ADD COLUMN onboarding_status TEXT DEFAULT 'pending';
  END IF;
END $$;

-- Add rejection_reason column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'rejection_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- Drop existing tables to recreate with proper constraints
DROP TABLE IF EXISTS public.department_signup_form_submissions CASCADE;
DROP TABLE IF EXISTS public.department_signup_forms CASCADE;

-- Create department_signup_forms table
CREATE TABLE public.department_signup_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  form_name TEXT NOT NULL,
  form_description TEXT,
  form_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_department_form UNIQUE(department_id)
);

-- Create department_signup_form_submissions table
CREATE TABLE public.department_signup_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.department_signup_forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submission_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  uploaded_files JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending',
  is_draft BOOLEAN DEFAULT false,
  draft_data JSONB DEFAULT '{}'::jsonb,
  completion_percentage INTEGER DEFAULT 0,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_form_submission UNIQUE(user_id, form_id)
);

-- Enable RLS
ALTER TABLE public.department_signup_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_signup_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for department_signup_forms
CREATE POLICY "Authenticated users can view department forms"
  ON public.department_signup_forms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage department forms"
  ON public.department_signup_forms FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for department_signup_form_submissions
CREATE POLICY "Users can view their own submissions"
  ON public.department_signup_form_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions"
  ON public.department_signup_form_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions"
  ON public.department_signup_form_submissions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all submissions"
  ON public.department_signup_form_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all submissions"
  ON public.department_signup_form_submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add triggers
CREATE TRIGGER update_department_signup_forms_updated_at
  BEFORE UPDATE ON public.department_signup_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_department_signup_form_submissions_updated_at
  BEFORE UPDATE ON public.department_signup_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Insert default forms for each department
DO $$
DECLARE
  dept_id UUID;
BEGIN
  -- IT Department
  SELECT id INTO dept_id FROM public.departments WHERE name = 'IT' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'IT Department Onboarding',
      'Please complete this form to join the IT department. Upload your offer letter and resume.',
      '[
        {"id": "full_name", "type": "text", "label": "Full Name", "required": true, "placeholder": "Enter your full name"},
        {"id": "phone", "type": "phone", "label": "Phone Number", "required": true, "placeholder": "+1 234 567 8900"},
        {"id": "offer_letter", "type": "file", "label": "Offer Letter", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 5},
        {"id": "resume", "type": "file", "label": "Resume/CV", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 5},
        {"id": "skills", "type": "textarea", "label": "Technical Skills", "required": true, "placeholder": "List your technical skills"}
      ]'::jsonb
    );
  END IF;

  -- Sales Department
  SELECT id INTO dept_id FROM public.departments WHERE name = 'Sales' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'Sales Department Onboarding',
      'Please complete this form to join the Sales department. Upload your video pitch and resume.',
      '[
        {"id": "full_name", "type": "text", "label": "Full Name", "required": true, "placeholder": "Enter your full name"},
        {"id": "phone", "type": "phone", "label": "Phone Number", "required": true, "placeholder": "+1 234 567 8900"},
        {"id": "video_pitch", "type": "file", "label": "Video Pitch (60 seconds)", "required": true, "fileTypes": ["mp4", "mov", "avi"], "maxFileSize": 50},
        {"id": "resume", "type": "file", "label": "Resume/CV", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 5},
        {"id": "sales_experience", "type": "textarea", "label": "Sales Experience", "required": true, "placeholder": "Describe your sales experience"}
      ]'::jsonb
    );
  END IF;

  -- Marketing Department
  SELECT id INTO dept_id FROM public.departments WHERE name = 'Marketing' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'Marketing Department Onboarding',
      'Please complete this form to join the Marketing department. Upload your portfolio and resume.',
      '[
        {"id": "full_name", "type": "text", "label": "Full Name", "required": true, "placeholder": "Enter your full name"},
        {"id": "phone", "type": "phone", "label": "Phone Number", "required": true, "placeholder": "+1 234 567 8900"},
        {"id": "portfolio", "type": "file", "label": "Portfolio (PDF)", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 10},
        {"id": "resume", "type": "file", "label": "Resume/CV", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 5},
        {"id": "portfolio_url", "type": "text", "label": "Portfolio URL", "required": false, "placeholder": "https://yourportfolio.com"},
        {"id": "campaigns", "type": "textarea", "label": "Notable Campaigns", "required": true, "placeholder": "Describe your campaigns"}
      ]'::jsonb
    );
  END IF;

  -- HR Department
  SELECT id INTO dept_id FROM public.departments WHERE name = 'HR' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'HR Department Onboarding',
      'Please complete this form to join the HR department. Upload your certifications and resume.',
      '[
        {"id": "full_name", "type": "text", "label": "Full Name", "required": true, "placeholder": "Enter your full name"},
        {"id": "phone", "type": "phone", "label": "Phone Number", "required": true, "placeholder": "+1 234 567 8900"},
        {"id": "certifications", "type": "file", "label": "HR Certifications", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 10},
        {"id": "resume", "type": "file", "label": "Resume/CV", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 5},
        {"id": "hr_experience", "type": "textarea", "label": "HR Experience", "required": true, "placeholder": "Describe your HR experience"}
      ]'::jsonb
    );
  END IF;

  -- Finance Department
  SELECT id INTO dept_id FROM public.departments WHERE name = 'Finance' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'Finance Department Onboarding',
      'Please complete this form to join the Finance department. Upload your degree certificate and resume.',
      '[
        {"id": "full_name", "type": "text", "label": "Full Name", "required": true, "placeholder": "Enter your full name"},
        {"id": "phone", "type": "phone", "label": "Phone Number", "required": true, "placeholder": "+1 234 567 8900"},
        {"id": "degree_certificate", "type": "file", "label": "Degree Certificate", "required": true, "fileTypes": ["pdf"], "maxFileSize": 5},
        {"id": "resume", "type": "file", "label": "Resume/CV", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 5},
        {"id": "certifications", "type": "file", "label": "Professional Certifications", "required": false, "fileTypes": ["pdf"], "maxFileSize": 5},
        {"id": "finance_experience", "type": "textarea", "label": "Finance Experience", "required": true, "placeholder": "Describe your finance experience"}
      ]'::jsonb
    );
  END IF;

  -- Operations Department
  SELECT id INTO dept_id FROM public.departments WHERE name = 'Operations' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'Operations Department Onboarding',
      'Please complete this form to join the Operations department. Upload your experience letter and resume.',
      '[
        {"id": "full_name", "type": "text", "label": "Full Name", "required": true, "placeholder": "Enter your full name"},
        {"id": "phone", "type": "phone", "label": "Phone Number", "required": true, "placeholder": "+1 234 567 8900"},
        {"id": "experience_letter", "type": "file", "label": "Experience Letter", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 5},
        {"id": "resume", "type": "file", "label": "Resume/CV", "required": true, "fileTypes": ["pdf", "docx"], "maxFileSize": 5},
        {"id": "operations_experience", "type": "textarea", "label": "Operations Experience", "required": true, "placeholder": "Describe your operations experience"}
      ]'::jsonb
    );
  END IF;
END $$;

-- Create indexes
CREATE INDEX idx_department_signup_forms_department_id ON public.department_signup_forms(department_id);
CREATE INDEX idx_department_signup_form_submissions_user_id ON public.department_signup_form_submissions(user_id);
CREATE INDEX idx_department_signup_form_submissions_status ON public.department_signup_form_submissions(status);
CREATE INDEX idx_department_signup_form_submissions_form_id ON public.department_signup_form_submissions(form_id);
```

---

## 🔐 **STEP 2: CREATE ADMIN USER**

### **⚠️ IMPORTANT: Single Admin Setup**

**Admin Credentials:**
- Email: `admin@gmail.com`
- Password: `admin12`

### **Follow These Steps Exactly:**

#### **Step 2.1: Sign Up Through the App**

1. Go to http://localhost:8081/auth
2. Click "Sign Up"
3. Enter these details:
   - **Email:** `admin@gmail.com`
   - **Password:** `admin12`
   - **Department:** IT (doesn't matter for admin)
4. Click "Sign Up"
5. You'll be redirected to onboarding page - **DON'T FILL IT**, just note that account is created

#### **Step 2.2: Grant Admin Role in Supabase**

1. Go to Supabase Dashboard → SQL Editor
2. Run this query to make the account admin:

```sql
-- Make admin@gmail.com an admin
-- This query will find the user and grant admin role

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the user ID for admin@gmail.com
  SELECT id INTO admin_user_id 
  FROM auth.users 
  WHERE email = 'admin@gmail.com' 
  LIMIT 1;

  -- If user exists, make them admin
  IF admin_user_id IS NOT NULL THEN
    -- First, remove any other admin roles (ensure only one admin)
    DELETE FROM public.user_roles WHERE role = 'admin';
    
    -- Grant admin role to admin@gmail.com
    INSERT INTO public.user_roles (user_id, role)
    VALUES (admin_user_id, 'admin');
    
    -- Update profile to verified status (profiles.id = auth.users.id)
    UPDATE public.profiles 
    SET onboarding_status = 'verified',
        rejection_reason = NULL
    WHERE id = admin_user_id;
    
    RAISE NOTICE 'Admin role granted to admin@gmail.com';
  ELSE
    RAISE EXCEPTION 'User admin@gmail.com not found. Please sign up first at http://localhost:8081/auth';
  END IF;
END $$;
```

#### **Step 2.3: Verify Admin Setup**

Run this to confirm:

```sql
-- Verify admin user
SELECT 
  u.email,
  ur.role,
  p.onboarding_status
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
JOIN public.profiles p ON p.user_id = u.id
WHERE ur.role = 'admin';

-- Should show:
-- email: admin@gmail.com
-- role: admin
-- onboarding_status: approved
```

#### **Step 2.4: Login as Admin**

1. Logout from current session
2. Go to http://localhost:8081/auth
3. Click "Sign In"
4. Enter:
   - **Email:** `admin@gmail.com`
   - **Password:** `admin12`
5. You should see the Admin Dashboard! 🎉

---

## ✅ **STEP 3: VERIFY EVERYTHING WORKS**

Run these verification queries:

```sql
-- Check departments
SELECT * FROM public.departments;
-- Should show 6 rows: IT, Sales, Marketing, HR, Finance, Operations

-- Check forms created
SELECT 
  d.name as department,
  f.form_name,
  jsonb_array_length(f.form_fields) as field_count
FROM public.department_signup_forms f
JOIN public.departments d ON d.id = f.department_id;
-- Should show 6 forms

-- Check admin user
SELECT 
  u.email,
  ur.role
FROM auth.users u
JOIN public.user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
-- Should show your admin email
```

---

## 🎯 **ADMIN LOGIN CREDENTIALS**

**Use these exact credentials:**
- **Email:** `admin@gmail.com`
- **Password:** `admin12`

⚠️ **Note:** Only ONE admin should exist in the system. The SQL query above ensures this by removing any other admin roles before granting.

---

## 🚨 **TROUBLESHOOTING**

### **Error: "Table already exists"**
The migration now uses `DROP TABLE IF EXISTS`, so this shouldn't happen. But if it does:
```sql
DROP TABLE IF EXISTS public.department_signup_form_submissions CASCADE;
DROP TABLE IF EXISTS public.department_signup_forms CASCADE;
```
Then run the migration again.

### **Error: "User not admin"**
Run this to check who has admin role:
```sql
SELECT u.email, ur.role 
FROM auth.users u 
JOIN user_roles ur ON ur.user_id = u.id;
```

To make someone admin:
```sql
-- Replace with actual user ID
INSERT INTO user_roles (user_id, role)
VALUES ('user-id-here', 'admin');
```

### **Can't login as admin**
1. Make sure you signed up first
2. Then run the admin grant SQL
3. Logout and login again

---

## 📊 **VERIFY TRAINING/COURSES FEATURE**

The training feature is ALREADY WORKING! Check it:

```sql
-- View training sessions
SELECT * FROM public.training_sessions;

-- View training assignments
SELECT * FROM public.training_assignments;
```

Admins can already:
- ✅ Create training sessions (YouTube links, PDFs, external links)
- ✅ Assign to specific departments
- ✅ Set as mandatory/optional
- ✅ Track employee progress

This is in the **Training tab** of the Admin Dashboard!

---

## 🎓 **TRAINING/COURSES FEATURE USAGE**

### **Admin Can:**
1. Go to Dashboard → Training tab
2. Click "Create Training Session"
3. Fill in:
   - Title: "Python Basics"
   - Description: "Learn Python fundamentals"
   - Resource Type: YouTube / PDF / External Link
   - Resource URL: https://youtube.com/watch?v=...
   - Duration: 60 minutes
   - Mandatory: Yes/No
   - Department: IT (or All)
4. Assign to employees

### **Employees See:**
- Assigned training sessions in their dashboard
- Can click to open YouTube/PDF/link
- Progress tracking
- Completion status

---

**Now run the SQL and you're ready to go! 🚀**

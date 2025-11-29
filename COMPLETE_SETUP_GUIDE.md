# 🎯 COMPLETE DATABASE SETUP - RUN IN ORDER

## ⚠️ INSTRUCTIONS: Run these queries IN ORDER in Supabase SQL Editor

---

## 📋 **STEP 1: RUN THE MAIN MIGRATION (Run this first)**

Copy and paste this complete migration:

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

## ✅ **STEP 2: VERIFY THE MIGRATION WORKED**

Run these verification queries:

```sql
-- Check departments (should show 6)
SELECT * FROM public.departments;

-- Check forms created (should show 6 forms)
SELECT 
  d.name as department,
  f.form_name,
  jsonb_array_length(f.form_fields) as field_count
FROM public.department_signup_forms f
JOIN public.departments d ON d.id = f.department_id;
```

---

## 🔐 **STEP 3: CREATE ADMIN USER**

**First, sign up at http://localhost:8081/auth with:**
- Email: `khushi.cai12@gmail.com`
- Password: `admin12`

**Then run this SQL:**

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
    
    -- Set profile to verified
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

## ✅ **STEP 4: VERIFY ADMIN WAS CREATED**

```sql
-- Check admin user (should show 1 row)
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
- Email: `khushi.cai12@gmail.com`
- Role: `admin`
- Status: `verified`

---

## 🎉 **STEP 5: LOGIN AS ADMIN**

1. Go to http://localhost:8081/auth
2. Logout if logged in
3. Sign in with:
   - Email: `khushi.cai12@gmail.com`
   - Password: `admin12`
4. You should see the Admin Dashboard!

---

## 📝 **SUMMARY**

**What this does:**
1. ✅ Creates 6 departments (IT, Sales, Marketing, HR, Finance, Operations)
2. ✅ Creates department-specific onboarding forms with unique document requirements
3. ✅ Sets up approval workflow tables
4. ✅ Creates ONE admin user (khushi.cai12@gmail.com)
5. ✅ Grants admin access and bypasses onboarding

**Your Admin Credentials:**
- Email: `khushi.cai12@gmail.com`
- Password: `admin12`

**Run the steps in order and you're done!** 🚀

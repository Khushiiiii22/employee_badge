-- Migration: Setup Department Onboarding Workflow
-- Date: 2025-11-29
-- Description: Creates 6 departments with specific document requirements and approval workflow

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

-- Drop table if exists to recreate with proper constraints
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

-- Enable RLS on department_signup_forms
ALTER TABLE public.department_signup_forms ENABLE ROW LEVEL SECURITY;

-- RLS Policies for department_signup_forms
DROP POLICY IF EXISTS "Authenticated users can view department forms" ON public.department_signup_forms;
CREATE POLICY "Authenticated users can view department forms"
  ON public.department_signup_forms FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage department forms" ON public.department_signup_forms;
CREATE POLICY "Admins can manage department forms"
  ON public.department_signup_forms FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

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

-- Enable RLS on department_signup_form_submissions
ALTER TABLE public.department_signup_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for department_signup_form_submissions
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.department_signup_form_submissions;
CREATE POLICY "Users can view their own submissions"
  ON public.department_signup_form_submissions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own submissions" ON public.department_signup_form_submissions;
CREATE POLICY "Users can create their own submissions"
  ON public.department_signup_form_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own submissions" ON public.department_signup_form_submissions;
CREATE POLICY "Users can update their own submissions"
  ON public.department_signup_form_submissions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all submissions" ON public.department_signup_form_submissions;
CREATE POLICY "Admins can view all submissions"
  ON public.department_signup_form_submissions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update all submissions" ON public.department_signup_form_submissions;
CREATE POLICY "Admins can update all submissions"
  ON public.department_signup_form_submissions FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- Add updated_at trigger for department_signup_forms
DROP TRIGGER IF EXISTS update_department_signup_forms_updated_at ON public.department_signup_forms;
CREATE TRIGGER update_department_signup_forms_updated_at
  BEFORE UPDATE ON public.department_signup_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Add updated_at trigger for department_signup_form_submissions
DROP TRIGGER IF EXISTS update_department_signup_form_submissions_updated_at ON public.department_signup_form_submissions;
CREATE TRIGGER update_department_signup_form_submissions_updated_at
  BEFORE UPDATE ON public.department_signup_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Now insert default forms for each department
-- Get department IDs first and insert forms

DO $$
DECLARE
  dept_id UUID;
BEGIN
  -- IT Department Form
  SELECT id INTO dept_id FROM public.departments WHERE name = 'IT' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'IT Department Onboarding',
      'Please complete this form to join the IT department. Upload your offer letter and resume.',
      '[
        {
          "id": "full_name",
          "type": "text",
          "label": "Full Name",
          "required": true,
          "placeholder": "Enter your full name"
        },
        {
          "id": "phone",
          "type": "phone",
          "label": "Phone Number",
          "required": true,
          "placeholder": "+1 234 567 8900"
        },
        {
          "id": "offer_letter",
          "type": "file",
          "label": "Offer Letter",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 5
        },
        {
          "id": "resume",
          "type": "file",
          "label": "Resume/CV",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 5
        },
        {
          "id": "skills",
          "type": "textarea",
          "label": "Technical Skills",
          "required": true,
          "placeholder": "List your technical skills (e.g., Python, JavaScript, SQL)"
        }
      ]'::jsonb
    ) ON CONFLICT (department_id) DO UPDATE SET
      form_fields = EXCLUDED.form_fields,
      form_description = EXCLUDED.form_description;
  END IF;

  -- Sales Department Form
  SELECT id INTO dept_id FROM public.departments WHERE name = 'Sales' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'Sales Department Onboarding',
      'Please complete this form to join the Sales department. Upload your video pitch and resume.',
      '[
        {
          "id": "full_name",
          "type": "text",
          "label": "Full Name",
          "required": true,
          "placeholder": "Enter your full name"
        },
        {
          "id": "phone",
          "type": "phone",
          "label": "Phone Number",
          "required": true,
          "placeholder": "+1 234 567 8900"
        },
        {
          "id": "video_pitch",
          "type": "file",
          "label": "Video Pitch (60 seconds)",
          "required": true,
          "fileTypes": ["mp4", "mov", "avi"],
          "maxFileSize": 50
        },
        {
          "id": "resume",
          "type": "file",
          "label": "Resume/CV",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 5
        },
        {
          "id": "sales_experience",
          "type": "textarea",
          "label": "Sales Experience",
          "required": true,
          "placeholder": "Describe your sales experience and achievements"
        }
      ]'::jsonb
    ) ON CONFLICT (department_id) DO UPDATE SET
      form_fields = EXCLUDED.form_fields,
      form_description = EXCLUDED.form_description;
  END IF;

  -- Marketing Department Form
  SELECT id INTO dept_id FROM public.departments WHERE name = 'Marketing' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'Marketing Department Onboarding',
      'Please complete this form to join the Marketing department. Upload your portfolio and resume.',
      '[
        {
          "id": "full_name",
          "type": "text",
          "label": "Full Name",
          "required": true,
          "placeholder": "Enter your full name"
        },
        {
          "id": "phone",
          "type": "phone",
          "label": "Phone Number",
          "required": true,
          "placeholder": "+1 234 567 8900"
        },
        {
          "id": "portfolio",
          "type": "file",
          "label": "Portfolio (PDF or Link Document)",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 10
        },
        {
          "id": "resume",
          "type": "file",
          "label": "Resume/CV",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 5
        },
        {
          "id": "portfolio_url",
          "type": "text",
          "label": "Portfolio Website/Behance URL",
          "required": false,
          "placeholder": "https://yourportfolio.com"
        },
        {
          "id": "campaigns",
          "type": "textarea",
          "label": "Notable Campaigns/Projects",
          "required": true,
          "placeholder": "Describe your marketing campaigns or projects"
        }
      ]'::jsonb
    ) ON CONFLICT (department_id) DO UPDATE SET
      form_fields = EXCLUDED.form_fields,
      form_description = EXCLUDED.form_description;
  END IF;

  -- HR Department Form
  SELECT id INTO dept_id FROM public.departments WHERE name = 'HR' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'HR Department Onboarding',
      'Please complete this form to join the HR department. Upload your certifications and resume.',
      '[
        {
          "id": "full_name",
          "type": "text",
          "label": "Full Name",
          "required": true,
          "placeholder": "Enter your full name"
        },
        {
          "id": "phone",
          "type": "phone",
          "label": "Phone Number",
          "required": true,
          "placeholder": "+1 234 567 8900"
        },
        {
          "id": "certifications",
          "type": "file",
          "label": "HR Certifications (PHR, SHRM, etc.)",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 10
        },
        {
          "id": "resume",
          "type": "file",
          "label": "Resume/CV",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 5
        },
        {
          "id": "hr_experience",
          "type": "textarea",
          "label": "HR Experience",
          "required": true,
          "placeholder": "Describe your HR experience and specializations"
        }
      ]'::jsonb
    ) ON CONFLICT (department_id) DO UPDATE SET
      form_fields = EXCLUDED.form_fields,
      form_description = EXCLUDED.form_description;
  END IF;

  -- Finance Department Form
  SELECT id INTO dept_id FROM public.departments WHERE name = 'Finance' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'Finance Department Onboarding',
      'Please complete this form to join the Finance department. Upload your degree certificate and resume.',
      '[
        {
          "id": "full_name",
          "type": "text",
          "label": "Full Name",
          "required": true,
          "placeholder": "Enter your full name"
        },
        {
          "id": "phone",
          "type": "phone",
          "label": "Phone Number",
          "required": true,
          "placeholder": "+1 234 567 8900"
        },
        {
          "id": "degree_certificate",
          "type": "file",
          "label": "Degree Certificate (Finance/Accounting)",
          "required": true,
          "fileTypes": ["pdf"],
          "maxFileSize": 5
        },
        {
          "id": "resume",
          "type": "file",
          "label": "Resume/CV",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 5
        },
        {
          "id": "certifications",
          "type": "file",
          "label": "Professional Certifications (CPA, CFA, etc.)",
          "required": false,
          "fileTypes": ["pdf"],
          "maxFileSize": 5
        },
        {
          "id": "finance_experience",
          "type": "textarea",
          "label": "Finance Experience",
          "required": true,
          "placeholder": "Describe your finance and accounting experience"
        }
      ]'::jsonb
    ) ON CONFLICT (department_id) DO UPDATE SET
      form_fields = EXCLUDED.form_fields,
      form_description = EXCLUDED.form_description;
  END IF;

  -- Operations Department Form
  SELECT id INTO dept_id FROM public.departments WHERE name = 'Operations' LIMIT 1;
  IF dept_id IS NOT NULL THEN
    INSERT INTO public.department_signup_forms (department_id, form_name, form_description, form_fields)
    VALUES (
      dept_id,
      'Operations Department Onboarding',
      'Please complete this form to join the Operations department. Upload your experience letter and resume.',
      '[
        {
          "id": "full_name",
          "type": "text",
          "label": "Full Name",
          "required": true,
          "placeholder": "Enter your full name"
        },
        {
          "id": "phone",
          "type": "phone",
          "label": "Phone Number",
          "required": true,
          "placeholder": "+1 234 567 8900"
        },
        {
          "id": "experience_letter",
          "type": "file",
          "label": "Experience Letter from Previous Employer",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 5
        },
        {
          "id": "resume",
          "type": "file",
          "label": "Resume/CV",
          "required": true,
          "fileTypes": ["pdf", "docx"],
          "maxFileSize": 5
        },
        {
          "id": "operations_experience",
          "type": "textarea",
          "label": "Operations Experience",
          "required": true,
          "placeholder": "Describe your operations and logistics experience"
        }
      ]'::jsonb
    ) ON CONFLICT (department_id) DO UPDATE SET
      form_fields = EXCLUDED.form_fields,
      form_description = EXCLUDED.form_description;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_department_signup_forms_department_id 
  ON public.department_signup_forms(department_id);

CREATE INDEX IF NOT EXISTS idx_department_signup_form_submissions_user_id 
  ON public.department_signup_form_submissions(user_id);

CREATE INDEX IF NOT EXISTS idx_department_signup_form_submissions_status 
  ON public.department_signup_form_submissions(status);

CREATE INDEX IF NOT EXISTS idx_department_signup_form_submissions_form_id 
  ON public.department_signup_form_submissions(form_id);

-- Comment on tables
COMMENT ON TABLE public.department_signup_forms IS 'Stores department-specific onboarding forms with dynamic fields';
COMMENT ON TABLE public.department_signup_form_submissions IS 'Stores employee submissions for department onboarding forms with approval workflow';

-- Enhance department_signup_form_submissions table for better onboarding experience
ALTER TABLE public.department_signup_form_submissions 
ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS draft_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS uploaded_files JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_department_signup_form_submissions_draft ON public.department_signup_form_submissions(is_draft);
CREATE INDEX IF NOT EXISTS idx_department_signup_form_submissions_user_status ON public.department_signup_form_submissions(user_id, status);

-- Add comments for documentation
COMMENT ON COLUMN public.department_signup_form_submissions.is_draft IS 'Indicates if this is a draft submission (incomplete form)';
COMMENT ON COLUMN public.department_signup_form_submissions.draft_data IS 'JSON data containing partially filled form fields for drafts';
COMMENT ON COLUMN public.department_signup_form_submissions.uploaded_files IS 'JSON array containing information about uploaded files';
COMMENT ON COLUMN public.department_signup_form_submissions.completion_percentage IS 'Percentage of form completion (0-100)';
COMMENT ON COLUMN public.department_signup_form_submissions.last_saved_at IS 'Last time this submission was saved (for auto-save functionality)';

-- Create trigger for updating last_saved_at
DROP TRIGGER IF EXISTS update_department_signup_form_submissions_last_saved_at ON public.department_signup_form_submissions;
CREATE TRIGGER update_department_signup_form_submissions_last_saved_at
  BEFORE UPDATE ON public.department_signup_form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- Update RLS policies to handle draft submissions
DROP POLICY IF EXISTS "Users can create submissions" ON public.department_signup_form_submissions;
CREATE POLICY "Users can create submissions"
  ON public.department_signup_form_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own submissions" ON public.department_signup_form_submissions;
CREATE POLICY "Users can view their own submissions"
  ON public.department_signup_form_submissions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own draft submissions" ON public.department_signup_form_submissions;
CREATE POLICY "Users can update their own draft submissions"
  ON public.department_signup_form_submissions FOR UPDATE
  USING (user_id = auth.uid() AND is_draft = TRUE);
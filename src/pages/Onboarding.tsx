import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileCheck, ArrowLeft, Save, Eye, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Department {
  id: string;
  name: string;
}

interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'dropdown' | 'file' | 'textarea';
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  fileTypes?: string[];
  maxFileSize?: number;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

interface DepartmentSignupForm {
  id: string;
  department_id: string;
  form_name: string;
  form_description?: string;
  form_fields: FormField[];
}

interface DraftSubmission {
  id: string;
  draft_data: Record<string, any>;
  uploaded_files: any[];
  completion_percentage: number;
  last_saved_at?: string;
  status: string;
  rejection_reason?: string;
  is_draft: boolean;
  submitted_at?: string;
}

interface UploadedFile {
  fieldId: string;
  file: File;
  url?: string;
}

interface DocumentTemplate {
  id: string;
  title: string;
  description?: string;
  file_types?: string[];
  max_file_size?: number;
  is_required: boolean;
}

const Onboarding = () => {
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [departmentForm, setDepartmentForm] = useState<DepartmentSignupForm | null>(null);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, File>>({});
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [draftSubmission, setDraftSubmission] = useState<DraftSubmission | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    initializeOnboarding();
  }, []);

  useEffect(() => {
    calculateCompletionPercentage();
  }, [formData, uploadedFiles, uploadedDocs, departmentForm, documentTemplates]);

  const initializeOnboarding = async () => {
    await checkAuth();
    await loadUserProfile();
  };

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile, error } = await supabase
        .from("profiles")
        .select(`
          *,
          departments(name)
        `)
        .eq("id", user.id)
        .single();

      if (error) throw error;

      setUserProfile(profile);

      // Check onboarding status
      if (profile.onboarding_status === 'verified') {
        // User is already verified, redirect to dashboard
        navigate("/dashboard");
        return;
      }

      // Load department form if user has department
      if (profile.department_id) {
        await loadDepartmentForm(profile.department_id);
        await loadDocumentTemplates(profile.department_id);
        await loadExistingSubmission(user.id, profile.department_id);
      } else {
        // User needs to be assigned a department first
        toast({
          variant: "destructive",
          title: "Department Not Assigned",
          description: "Please contact your administrator to assign you to a department.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading profile",
        description: error.message,
      });
    }
  };

  const loadDepartmentForm = async (departmentId: string) => {
    try {
      const { data: formData, error: formError } = await supabase
        .from("department_signup_forms")
        .select("*")
        .eq("department_id", departmentId)
        .single();

      if (formError) {
        if (formError.code === 'PGRST116') {
          // No form found for this department
          setDepartmentForm(null);
          return;
        }
        throw formError;
      }

      setDepartmentForm({
        ...formData,
        form_fields: formData.form_fields as unknown as FormField[]
      });
    } catch (error: any) {
      console.error("Error loading department form:", error);
      toast({
        variant: "destructive",
        title: "Error loading form",
        description: error.message,
      });
    }
  };

  const loadDocumentTemplates = async (departmentId: string) => {
    try {
      const { data: docs, error } = await supabase
        .from("department_document_templates")
        .select("*")
        .eq("department_id", departmentId)
        .order("title");

      if (error) throw error;
      setDocumentTemplates(docs || []);
    } catch (error: any) {
      console.error("Error loading document templates:", error);
      toast({
        variant: "destructive",
        title: "Error loading document requirements",
        description: error.message,
      });
    }
  };

  const loadExistingSubmission = async (userId: string, departmentId: string) => {
    try {
      const { data: form } = await supabase
        .from("department_signup_forms")
        .select("id")
        .eq("department_id", departmentId)
        .single();

      if (!form) return;

      const { data: submission, error } = await supabase
        .from("department_signup_form_submissions")
        .select("*")
        .eq("user_id", userId)
        .eq("form_id", form.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error loading submission:", error);
        return;
      }

      if (submission) {
        setDraftSubmission(submission as DraftSubmission);
        setSubmissionStatus(submission.status);
        setRejectionReason(submission.rejection_reason || null);

        // If it's a draft or rejected, restore the data
        if (submission.is_draft || submission.status === 'rejected') {
          setFormData(submission.draft_data as Record<string, any> || {});
          setCompletionPercentage(submission.completion_percentage || 0);
        }

        // If submission is pending, show pending message
        if (submission.status === 'pending' && !submission.is_draft) {
          // Show pending state
        }
      }
    } catch (error: any) {
      console.error("Error loading submission:", error);
    }
  };

  const calculateCompletionPercentage = () => {
    const totalItems = (departmentForm?.form_fields.length || 0) + documentTemplates.length;
    if (totalItems === 0) {
      setCompletionPercentage(0);
      return;
    }

    let completed = 0;

    // Form fields
    if (departmentForm) {
      completed += departmentForm.form_fields.filter(field => {
        const value = formData[field.id];
        if (field.type === 'file') {
          return uploadedFiles[field.id] !== undefined;
        }
        return value !== undefined && value !== null && value.toString().trim() !== '';
      }).length;
    }

    // Document templates
    completed += documentTemplates.filter(doc => uploadedDocs[doc.id] !== undefined).length;

    const percentage = Math.round((completed / totalItems) * 100);
    setCompletionPercentage(percentage);
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));

    // Clear error for this field if it exists
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const handleFileChange = async (fieldId: string, file: File | null) => {
    if (!file) {
      setUploadedFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[fieldId];
        return newFiles;
      });
      return;
    }

    // Validate file
    const field = departmentForm?.form_fields.find(f => f.id === fieldId);
    if (field) {
      // Check file size
      const maxSizeMB = field.maxFileSize || 5;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `File size must be less than ${maxSizeMB}MB`,
        });
        return;
      }

      // Check file type
      if (field.fileTypes && field.fileTypes.length > 0) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !field.fileTypes.includes(fileExt)) {
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: `File type must be one of: ${field.fileTypes.join(', ')}`,
          });
          return;
        }
      }
    }

    setUploadedFiles(prev => ({ ...prev, [fieldId]: file }));
  };

  const handleDocumentUpload = async (docId: string, file: File | null) => {
    if (!file) {
      setUploadedDocs(prev => {
        const newDocs = { ...prev };
        delete newDocs[docId];
        return newDocs;
      });
      return;
    }

    const template = documentTemplates.find(d => d.id === docId);
    if (template) {
      // Check file size
      const maxSizeMB = template.max_file_size || 5;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        toast({
          variant: "destructive",
          title: "File too large",
          description: `File size must be less than ${maxSizeMB}MB`,
        });
        return;
      }

      // Check file type
      if (template.file_types && template.file_types.length > 0) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !template.file_types.includes(fileExt)) {
          toast({
            variant: "destructive",
            title: "Invalid file type",
            description: `File type must be one of: ${template.file_types.join(', ')}`,
          });
          return;
        }
      }
    }

    setUploadedDocs(prev => ({ ...prev, [docId]: file }));
  };

  const validateField = (field: FormField): string | null => {
    const value = formData[field.id];

    if (field.required) {
      if (field.type === 'file') {
        if (!uploadedFiles[field.id]) {
          return `${field.label} is required`;
        }
      } else {
        if (!value || value.toString().trim() === '') {
          return `${field.label} is required`;
        }
      }
    }

    if (value && field.type === 'email') {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(value)) {
        return 'Please enter a valid email address';
      }
    }

    if (value && field.type === 'phone') {
      const phonePattern = /^[\d\s\-\+\(\)]+$/;
      if (!phonePattern.test(value)) {
        return 'Please enter a valid phone number';
      }
    }

    if (value && field.validation) {
      if (field.validation.min && value.length < field.validation.min) {
        return `Minimum ${field.validation.min} characters required`;
      }
      if (field.validation.max && value.length > field.validation.max) {
        return `Maximum ${field.validation.max} characters allowed`;
      }
    }

    return null;
  };

  const validateForm = (): boolean => {
    if (!departmentForm) return false;

    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Validate form fields
    departmentForm.form_fields.forEach(field => {
      const error = validateField(field);
      if (error) {
        newErrors[field.id] = error;
        isValid = false;
      }
    });

    // Validate required documents
    documentTemplates.forEach(doc => {
      if (doc.is_required && !uploadedDocs[doc.id]) {
        newErrors[`doc_${doc.id}`] = `${doc.title} is required`;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const saveDraft = async () => {
    if (!departmentForm || !userProfile) return;

    setSavingDraft(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const submissionData = {
        form_id: departmentForm.id,
        user_id: user.id,
        is_draft: true,
        submission_data: {} as Json, // Empty for drafts
        draft_data: formData as Json,
        uploaded_files: [
          ...Object.entries(uploadedFiles).map(([fieldId, file]) => ({
            fieldId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
          })),
          ...Object.entries(uploadedDocs).map(([docId, file]) => ({
            fieldId: `doc_${docId}`,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size
          }))
        ] as Json,
        completion_percentage: completionPercentage,
        status: 'draft'
      };

      let error;
      if (draftSubmission) {
        // Update existing draft
        const { error: updateError } = await supabase
          .from("department_signup_form_submissions")
          .update(submissionData)
          .eq("id", draftSubmission.id);
        error = updateError;
      } else {
        // Create new draft
        const { error: insertError } = await supabase
          .from("department_signup_form_submissions")
          .insert(submissionData);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Draft saved",
        description: "Your progress has been saved. You can continue later.",
      });

      // Reload submission to get the ID
      await loadExistingSubmission(user.id, userProfile.department_id);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error saving draft",
        description: error.message,
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const uploadFiles = async (userId: string): Promise<Record<string, string>> => {
    const fileUrls: Record<string, string> = {};
    const allFiles = { ...uploadedFiles, ...uploadedDocs };
    const fileEntries = Object.entries(allFiles);
    let completed = 0;

    for (const [id, file] of fileEntries) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/onboarding_${id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      fileUrls[id] = publicUrl;

      // Determine document type
      let docType: 'aadhaar_card' | 'police_verification' | 'offer_letter' | 'resume' | 'other' = 'other';
      const template = documentTemplates.find(d => d.id === id);
      if (template) {
        if (template.title.toLowerCase().includes('aadhaar')) docType = 'aadhaar_card';
        else if (template.title.toLowerCase().includes('police')) docType = 'police_verification';
        else if (template.title.toLowerCase().includes('offer')) docType = 'offer_letter';
        else if (template.title.toLowerCase().includes('resume')) docType = 'resume';
      }

      // Save to onboarding_documents table
      await supabase
        .from('onboarding_documents')
        .insert([{
          user_id: userId,
          document_type: docType,
          file_name: file.name,
          file_url: publicUrl,
          file_type: file.type,
        }]);

      completed++;
      setUploadProgress((completed / fileEntries.length) * 100);
    }

    return fileUrls;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill in all required fields correctly.",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!departmentForm) throw new Error("No department form found");

      // Upload files first
      const fileUrls = await uploadFiles(user.id);

      // Prepare submission data
      const finalSubmissionData = {
        ...formData,
        ...fileUrls, // Include file URLs in submission data
        documentTemplates: documentTemplates.map(d => ({
          id: d.id,
          title: d.title,
          required: d.is_required,
          uploaded: !!uploadedDocs[d.id],
          url: fileUrls[d.id] || null
        }))
      } as Json;

      // Create or update submission
      const submissionData = {
        form_id: departmentForm.id,
        user_id: user.id,
        is_draft: false,
        submission_data: finalSubmissionData,
        uploaded_files: [
          ...Object.entries(uploadedFiles).map(([fieldId, file]) => ({
            fieldId,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            url: fileUrls[fieldId]
          })),
          ...Object.entries(uploadedDocs).map(([docId, file]) => ({
            fieldId: `doc_${docId}`,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            url: fileUrls[docId]
          }))
        ] as Json,
        completion_percentage: 100,
        status: 'pending'
      };

      let error;
      if (draftSubmission) {
        // Update existing draft to final submission
        const { error: updateError } = await supabase
          .from("department_signup_form_submissions")
          .update(submissionData)
          .eq("id", draftSubmission.id);
        error = updateError;
      } else {
        // Create new submission
        const { error: insertError } = await supabase
          .from("department_signup_form_submissions")
          .insert(submissionData);
        error = insertError;
      }

      if (error) throw error;

      // Update user profile to pending status (waiting for admin approval)
      await supabase
        .from('profiles')
        .update({
          department_id: userProfile.department_id,
          department_specific_data: finalSubmissionData,
          onboarding_status: 'pending',
          rejection_reason: null // Clear any previous rejection reason
        })
        .eq('id', user.id);

      toast({
        title: "Submission sent for approval!",
        description: "Your onboarding form has been submitted and is awaiting admin approval.",
      });

      // Reload to show pending state
      await loadUserProfile();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error submitting form",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getFieldComponent = (field: FormField) => {
    const error = errors[field.id];
    const value = formData[field.id] || '';

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
        return (
          <div className="space-y-2">
            <Input
              id={field.id}
              name={field.id}
              type={field.type === 'phone' ? 'tel' : field.type}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "textarea":
        return (
          <div className="space-y-2">
            <Textarea
              id={field.id}
              name={field.id}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              rows={3}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "dropdown":
        return (
          <div className="space-y-2">
            <Select
              value={value}
              onValueChange={(val) => handleFieldChange(field.id, val)}
              required={field.required}
            >
              <SelectTrigger className={error ? 'border-red-500' : ''}>
                <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option, index) => (
                  <SelectItem key={index} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "file":
        const uploadedFile = uploadedFiles[field.id];
        return (
          <div className="space-y-2">
            <Input
              id={field.id}
              type="file"
              accept={field.fileTypes?.map((type: string) => {
                if (type === 'pdf') return '.pdf';
                if (type === 'docx') return '.docx';
                if (type === 'image') return '.jpg,.jpeg,.png';
                return '.*';
              }).join(',') || '.pdf,.jpg,.jpeg,.png,.doc,.docx'}
              onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
              className={error ? 'border-red-500' : ''}
              required={field.required}
            />
            {uploadedFile && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <FileCheck className="w-3 h-3 text-green-600" />
                {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {field.fileTypes && (
              <p className="text-xs text-muted-foreground">
                Allowed: {field.fileTypes.join(', ')}
                {field.maxFileSize && ` • Max ${field.maxFileSize}MB`}
              </p>
            )}
          </div>
        );

      default:
        return (
          <div className="space-y-2">
            <Input
              id={field.id}
              name={field.id}
              type="text"
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              value={value}
              onChange={(e) => handleFieldChange(field.id, e.target.value)}
              required={field.required}
              className={error ? 'border-red-500' : ''}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!userProfile.department_id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="space-y-1 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl font-bold">Department Not Assigned</CardTitle>
            <CardDescription>
              Please contact your administrator to assign you to a department.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!departmentForm && documentTemplates.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="space-y-1 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
            <CardTitle className="text-2xl font-bold">No Onboarding Form or Documents</CardTitle>
            <CardDescription>
              No onboarding form or documents are defined for this department. Please contact admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show pending state if submission is under review
  if (submissionStatus === 'pending' && draftSubmission && !draftSubmission.is_draft) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-lg border-primary/10">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-yellow-500 rounded-xl">
                <AlertCircle className="w-12 h-12 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Submission Under Review</CardTitle>
            <CardDescription>
              Your onboarding submission has been sent to the admin for approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please wait while the admin reviews your submission. You will be notified once it's approved or if any changes are needed.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground text-center">
              Submitted on: {new Date(draftSubmission.submitted_at || Date.now()).toLocaleString()}
            </div>
            <Button onClick={() => navigate("/auth")} className="w-full" variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 sm:p-6 lg:p-8">
      <Card className="w-full max-w-2xl shadow-lg border-primary/10 my-4 sm:my-6 lg:my-8">
        <CardHeader className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/auth")}
            className="w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary rounded-xl">
              <Upload className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            {departmentForm.form_name}
          </CardTitle>
          {departmentForm.form_description && (
            <CardDescription className="text-center">
              {departmentForm.form_description}
            </CardDescription>
          )}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline">
              {userProfile.departments?.name || 'Your Department'}
            </Badge>
            {draftSubmission && (
              <Badge variant="secondary">
                <Save className="w-3 h-3 mr-1" />
                Draft Saved
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-180px)] overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Rejection Alert */}
            {submissionStatus === 'rejected' && rejectionReason && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-semibold mb-1">Your submission was rejected</div>
                  <div>{rejectionReason}</div>
                  <div className="mt-2 text-sm">Please make the necessary changes and resubmit.</div>
                </AlertDescription>
              </Alert>
            )}

            {/* Progress Indicator */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completionPercentage}%</span>
              </div>
              <Progress value={completionPercentage} />
            </div>

            {/* Draft Notification */}
            {draftSubmission && (
              <Alert>
                <Eye className="h-4 w-4" />
                <AlertDescription>
                  You have a saved draft from {new Date(draftSubmission.last_saved_at || Date.now()).toLocaleDateString()}.
                  Your progress has been restored.
                </AlertDescription>
              </Alert>
            )}

            {/* Form Fields */}
            {departmentForm && (
              <div className="space-y-4">
                <h3 className="font-semibold">Please complete the following information:</h3>
                {departmentForm.form_fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {getFieldComponent(field)}
                  </div>
                ))}
              </div>
            )}

            {/* Document Uploads */}
            {documentTemplates.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold">Required Documents:</h3>
                {documentTemplates.map((doc) => {
                  const error = errors[`doc_${doc.id}`];
                  const uploadedFile = uploadedDocs[doc.id];

                  return (
                    <div key={doc.id} className="space-y-2">
                      <Label>
                        {doc.title}
                        {doc.is_required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      <Input
                        type="file"
                        accept={doc.file_types?.map((type: string) => {
                          if (type === 'pdf') return '.pdf';
                          if (type === 'docx') return '.docx';
                          if (type === 'image') return '.jpg,.jpeg,.png';
                          return '.*';
                        }).join(',') || '.pdf,.jpg,.jpeg,.png,.doc,.docx'}
                        onChange={(e) => handleDocumentUpload(doc.id, e.target.files?.[0] || null)}
                        className={error ? 'border-red-500' : ''}
                        required={doc.is_required}
                      />
                      {uploadedFile && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileCheck className="w-3 h-3 text-green-600" />
                          {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)
                        </p>
                      )}
                      {error && <p className="text-sm text-red-500">{error}</p>}
                      {doc.description && (
                        <p className="text-xs text-muted-foreground">{doc.description}</p>
                      )}
                      {doc.file_types && (
                        <p className="text-xs text-muted-foreground">
                          Allowed: {doc.file_types.join(', ')}
                          {doc.max_file_size && ` • Max ${doc.max_file_size}MB`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload Progress */}
            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading files...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={saveDraft}
                disabled={savingDraft || completionPercentage === 0}
                className="flex-1 order-2 sm:order-1"
              >
                {savingDraft ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </>
                )}
              </Button>

              <Button
                type="submit"
                className="flex-1 order-1 sm:order-2"
                disabled={loading || completionPercentage < 100}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Form"
                )}
              </Button>
            </div>

            {completionPercentage < 100 && (
              <p className="text-sm text-muted-foreground text-center">
                Please complete all required fields before submitting. You can save a draft to continue later.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;

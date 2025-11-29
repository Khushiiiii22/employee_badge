import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    FileText,
    Download,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
    MoreHorizontal,
    User,
    Building2,
    Calendar,
    Filter,
    Search
} from "lucide-react";

interface Department {
    id: string;
    name: string;
}

interface FormSubmission {
    id: string;
    form_id: string;
    user_id: string;
    status: string;
    submission_data: any;
    submitted_at: string;
    is_draft: boolean;
    completion_percentage: number;
    last_saved_at: string;
    profiles: {
        full_name: string;
        email: string;
        departments: {
            name: string;
        };
    };
    department_signup_forms: {
        form_name: string;
        form_fields: any;
    };
}

interface UploadedFile {
    fieldId: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    url?: string;
}

const OnboardingSubmissionsTab = () => {
    const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
    const [filterDepartment, setFilterDepartment] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [submissionToReject, setSubmissionToReject] = useState<FormSubmission | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadData();
    }, [filterDepartment, filterStatus, searchTerm]);

    const loadData = async () => {
        await Promise.all([
            loadDepartments(),
            loadSubmissions()
        ]);
        setLoading(false);
    };

    const loadDepartments = async () => {
        try {
            const { data, error } = await supabase
                .from("departments")
                .select("*")
                .order("name");

            if (error) throw error;
            setDepartments(data || []);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error loading departments",
                description: error.message,
            });
        }
    };

    const loadSubmissions = async () => {
        try {
            // First, get all submissions
            let query = supabase
                .from("department_signup_form_submissions")
                .select(`
          *,
          department_signup_forms (
            form_name,
            form_fields
          )
        `)
                .order("submitted_at", { ascending: false });

            // Apply status filter
            if (filterStatus !== "all") {
                if (filterStatus === "draft") {
                    query = query.eq("is_draft", true);
                } else {
                    query = query.eq("status", filterStatus).eq("is_draft", false);
                }
            }

            const { data: submissionsData, error: submissionsError } = await query;

            if (submissionsError) {
                console.error("Error loading submissions:", submissionsError);
                if (submissionsError.message?.includes('does not exist') || submissionsError.code === 'PGRST116') {
                    toast({
                        variant: "destructive",
                        title: "Table not found",
                        description: "The department_signup_form_submissions table does not exist. Please run the database migration.",
                    });
                    return;
                }
                throw submissionsError;
            }

            if (!submissionsData || submissionsData.length === 0) {
                setSubmissions([]);
                return;
            }

            // Get unique user IDs
            const userIds = [...new Set(submissionsData.map(s => s.user_id))];

            // Fetch profiles for these users
            const { data: profilesData, error: profilesError } = await supabase
                .from("profiles")
                .select(`
          id,
          full_name,
          email,
          department_id,
          departments (name)
        `)
                .in("id", userIds);

            if (profilesError) {
                console.error("Error loading profiles:", profilesError);
                throw profilesError;
            }

            // Create a map of user_id to profile
            const profilesMap = new Map(
                (profilesData || []).map(profile => [profile.id, profile])
            );

            // Combine submissions with profiles
            let combinedData = submissionsData.map(submission => ({
                ...submission,
                profiles: profilesMap.get(submission.user_id) || null,
                department_signup_forms: {
                    ...submission.department_signup_forms,
                    form_fields: Array.isArray(submission.department_signup_forms.form_fields)
                        ? submission.department_signup_forms.form_fields
                        : []
                }
            }));

            // Apply department filter
            if (filterDepartment !== "all") {
                combinedData = combinedData.filter(
                    s => s.profiles?.department_id === filterDepartment
                );
            }

            // Apply search filter
            if (searchTerm) {
                const search = searchTerm.toLowerCase();
                combinedData = combinedData.filter(
                    s => 
                        s.profiles?.full_name?.toLowerCase().includes(search) ||
                        s.profiles?.email?.toLowerCase().includes(search)
                );
            }

            setSubmissions(combinedData as FormSubmission[]);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error loading submissions",
                description: error.message,
            });
        }
    };

    const updateSubmissionStatus = async (submissionId: string, newStatus: string, rejectionReason?: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // Get submission to find user_id
            const { data: submission } = await supabase
                .from("department_signup_form_submissions")
                .select("user_id")
                .eq("id", submissionId)
                .single();

            if (!submission) throw new Error("Submission not found");

            // Map submission status to profile onboarding_status
            // Submission statuses: 'pending', 'approved', 'rejected'
            // Profile statuses: 'pending', 'documents_uploaded', 'verified', 'rejected'
            const profileStatus = newStatus === 'approved' ? 'verified' : newStatus;

            // Update submission status
            const { error: submissionError } = await supabase
                .from("department_signup_form_submissions")
                .update({
                    status: newStatus,
                    reviewed_by: user.id,
                    reviewed_at: new Date().toISOString(),
                    rejection_reason: rejectionReason || null
                })
                .eq("id", submissionId);

            if (submissionError) throw submissionError;

            // Update profile onboarding_status
            const { error: profileError } = await supabase
                .from("profiles")
                .update({
                    onboarding_status: profileStatus,
                    rejection_reason: rejectionReason || null
                })
                .eq("id", submission.user_id);

            if (profileError) throw profileError;

            toast({
                title: "Status updated",
                description: `Submission has been ${newStatus === 'approved' ? 'approved' : newStatus}.`,
            });

            await loadSubmissions();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error updating status",
                description: error.message,
            });
        }
    };

    const downloadFile = async (fileUrl: string, fileName: string) => {
        try {
            const { data, error } = await supabase.storage
                .from('documents')
                .download(fileUrl.split('/').pop() || fileName);

            if (error) throw error;

            const blob = new Blob([data]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Error downloading file",
                description: error.message,
            });
        }
    };

    const getStatusBadge = (submission: FormSubmission) => {
        if (submission.is_draft) {
            return <Badge variant="secondary">Draft</Badge>;
        }

        switch (submission.status) {
            case "pending":
                return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
            case "approved":
                return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
            case "rejected":
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
            default:
                return <Badge variant="outline">{submission.status}</Badge>;
        }
    };

    const getCompletionColor = (percentage: number) => {
        if (percentage === 100) return "text-green-600";
        if (percentage >= 75) return "text-blue-600";
        if (percentage >= 50) return "text-yellow-600";
        return "text-red-600";
    };

    const viewSubmission = (submission: FormSubmission) => {
        setSelectedSubmission(submission);
        setIsViewDialogOpen(true);
    };

    const openRejectDialog = (submission: FormSubmission) => {
        setSubmissionToReject(submission);
        setRejectionReason("");
        setIsRejectDialogOpen(true);
    };

    const handleReject = async () => {
        if (!submissionToReject) return;
        
        if (!rejectionReason.trim()) {
            toast({
                variant: "destructive",
                title: "Rejection reason required",
                description: "Please provide a reason for rejection.",
            });
            return;
        }

        await updateSubmissionStatus(submissionToReject.id, "rejected", rejectionReason);
        setIsRejectDialogOpen(false);
        setSubmissionToReject(null);
        setRejectionReason("");
    };

    const renderFieldValue = (field: any, value: any) => {
        if (!value) return "-";

        switch (field.type) {
            case "file":
                if (typeof value === 'string' && value.startsWith('http')) {
                    return (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadFile(value, `document_${field.id}`)}
                            className="h-8"
                        >
                            <Download className="w-3 h-3 mr-1" />
                            Download
                        </Button>
                    );
                }
                return value;
            case "textarea":
                return (
                    <div className="max-w-xs truncate" title={value}>
                        {value}
                    </div>
                );
            default:
                return value;
        }
    };

    if (loading) {
        return <div className="text-muted-foreground">Loading submissions...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Onboarding Submissions</h2>
                    <p className="text-muted-foreground">View and manage employee onboarding submissions</p>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Filter className="w-5 h-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label>Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Department</Label>
                            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="draft">Drafts</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Submissions Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Submissions ({submissions.length})</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {submissions.length === 0 ? (
                        <div className="text-center py-12">
                            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-600 mb-2">No submissions found</h3>
                            <p className="text-sm text-gray-500">
                                {searchTerm || filterDepartment !== "all" || filterStatus !== "all"
                                    ? "Try adjusting your filters or search terms."
                                    : "No onboarding submissions have been made yet."}
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Employee</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Form</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Completion</TableHead>
                                        <TableHead>Submitted</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {submissions.map((submission) => (
                                        <TableRow key={submission.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{submission.profiles?.full_name || 'Unknown'}</div>
                                                    <div className="text-sm text-muted-foreground">{submission.profiles?.email}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4" />
                                                    {submission.profiles?.departments?.name || 'N/A'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{submission.department_signup_forms?.form_name || 'Unknown Form'}</div>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(submission)}
                                            </TableCell>
                                            <TableCell>
                                                <div className={`font-medium ${getCompletionColor(submission.completion_percentage)}`}>
                                                    {submission.completion_percentage}%
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="w-4 h-4" />
                                                    {submission.submitted_at
                                                        ? new Date(submission.submitted_at).toLocaleDateString()
                                                        : new Date(submission.last_saved_at).toLocaleDateString()
                                                    }
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => viewSubmission(submission)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            View Details
                                                        </DropdownMenuItem>
                                                        {!submission.is_draft && submission.status === "pending" && (
                                                            <>
                                                                <DropdownMenuItem onClick={() => updateSubmissionStatus(submission.id, "approved")}>
                                                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                                                    Approve
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => openRejectDialog(submission)}>
                                                                    <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                                                    Reject
                                                                </DropdownMenuItem>
                                                            </>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* View Submission Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Submission Details
                        </DialogTitle>
                        <DialogDescription>
                            Review the employee's onboarding submission and approve or reject it.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedSubmission && (
                        <div className="space-y-6">
                            {/* Employee Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Employee</Label>
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        <span>{selectedSubmission.profiles?.full_name}</span>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{selectedSubmission.profiles?.email}</div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Department</Label>
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        <span>{selectedSubmission.profiles?.departments?.name}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Submission Info */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Status</Label>
                                    {getStatusBadge(selectedSubmission)}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Completion</Label>
                                    <div className={`font-medium ${getCompletionColor(selectedSubmission.completion_percentage)}`}>
                                        {selectedSubmission.completion_percentage}%
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Submitted</Label>
                                    <div className="text-sm">
                                        {selectedSubmission.submitted_at
                                            ? new Date(selectedSubmission.submitted_at).toLocaleString()
                                            : new Date(selectedSubmission.last_saved_at).toLocaleString()
                                        }
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Form Data */}
                            <div className="space-y-4">
                                <h3 className="font-semibold">Form Data</h3>
                                <ScrollArea className="h-96">
                                    <div className="space-y-4">
                                        {selectedSubmission.department_signup_forms?.form_fields?.map((field: any) => (
                                            <div key={field.id} className="grid grid-cols-2 gap-4 p-3 border rounded-lg">
                                                <div>
                                                    <Label className="text-sm font-medium">{field.label}</Label>
                                                    <div className="text-xs text-muted-foreground">{field.type}</div>
                                                    {field.required && <Badge variant="outline" className="text-xs mt-1">Required</Badge>}
                                                </div>
                                                <div>
                                                    {renderFieldValue(field, selectedSubmission.submission_data?.[field.id])}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>

                            {/* Actions */}
                            {!selectedSubmission.is_draft && selectedSubmission.status === "pending" && (
                                <div className="flex gap-2 pt-4">
                                    <Button
                                        onClick={() => {
                                            updateSubmissionStatus(selectedSubmission.id, "approved");
                                            setIsViewDialogOpen(false);
                                        }}
                                        className="flex-1"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve Submission
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            setIsViewDialogOpen(false);
                                            openRejectDialog(selectedSubmission);
                                        }}
                                        className="flex-1"
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject Submission
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Submission Dialog */}
            <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <XCircle className="w-5 h-5" />
                            Reject Submission
                        </DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting this submission. The employee will be notified and can resubmit.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Please provide a reason for rejecting this submission. The employee will see this message and can resubmit.
                        </p>
                        <div className="space-y-2">
                            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
                            <Textarea
                                id="rejection-reason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="E.g., 'Please upload a clearer copy of your offer letter' or 'Your resume is missing work experience details'"
                                rows={4}
                                required
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsRejectDialogOpen(false);
                                    setRejectionReason("");
                                    setSubmissionToReject(null);
                                }}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleReject}
                                disabled={!rejectionReason.trim()}
                                className="flex-1"
                            >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject Submission
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default OnboardingSubmissionsTab;
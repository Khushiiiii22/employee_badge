import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mail, Phone, Building2, Briefcase, FileText, Download, ExternalLink } from "lucide-react";

interface UserInfoSidebarProps {
  profile: {
    full_name: string;
    email: string;
    phone_number?: string;
    departments?: { name: string };
    department_specific_data?: any;
  };
}

const UserInfoSidebar = ({ profile }: UserInfoSidebarProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isFileUrl = (value: any): boolean => {
    if (typeof value !== 'string') return false;
    return value.startsWith('http') && (
      value.includes('supabase.co/storage') || 
      value.match(/\.(pdf|doc|docx|jpg|jpeg|png|gif)$/i) !== null
    );
  };

  const getFileName = (url: string, fieldName: string): string => {
    // Try to extract filename from URL
    const urlParts = url.split('/');
    const lastPart = urlParts[urlParts.length - 1];
    
    // If it looks like a filename with extension, use it
    if (lastPart.includes('.')) {
      return decodeURIComponent(lastPart);
    }
    
    // Otherwise create a friendly name from the field name
    const extension = url.toLowerCase().includes('.pdf') ? '.pdf' : '';
    return `${fieldName.replace(/_/g, ' ')}${extension}`;
  };

  const formatFieldName = (key: string): string => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
      .trim();
  };

  const renderFieldValue = (key: string, value: any) => {
    // If it's a file URL
    if (isFileUrl(value)) {
      const fileName = getFileName(value, key);
      return (
        <div className="flex gap-2 mt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => window.open(value, '_blank')}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            asChild
          >
            <a href={value} download={fileName}>
              <Download className="w-3 h-3 mr-1" />
              Download
            </a>
          </Button>
        </div>
      );
    }

    // If it's an array or complex object
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1 mt-1">
          {value.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {item}
            </Badge>
          ))}
        </div>
      );
    }

    // Regular text value
    return <p className="text-sm mt-0.5">{String(value)}</p>;
  };

  // Separate document fields from regular fields
  const documentFields: { [key: string]: any } = {};
  const regularFields: { [key: string]: any } = {};

  if (profile.department_specific_data) {
    Object.entries(profile.department_specific_data).forEach(([key, value]) => {
      if (isFileUrl(value)) {
        documentFields[key] = value;
      } else {
        regularFields[key] = value;
      }
    });
  }

  return (
    <Card className="h-fit sticky top-4">
      <CardHeader className="text-center pb-3">
        <div className="flex justify-center mb-3">
          <Avatar className="w-20 h-20">
            <AvatarFallback className="text-xl bg-primary text-primary-foreground">
              {getInitials(profile.full_name)}
            </AvatarFallback>
          </Avatar>
        </div>
        <CardTitle className="text-xl">{profile.full_name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3">
          <Mail className="w-4 h-4 mt-1 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm break-all">{profile.email}</p>
          </div>
        </div>

        {profile.phone_number && (
          <div className="flex items-start gap-3">
            <Phone className="w-4 h-4 mt-1 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Phone</p>
              <p className="text-sm">{profile.phone_number}</p>
            </div>
          </div>
        )}

        <div className="flex items-start gap-3">
          <Building2 className="w-4 h-4 mt-1 text-muted-foreground" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm">{profile.departments?.name || "Not Assigned"}</p>
          </div>
        </div>

        {/* Regular Additional Info */}
        {Object.keys(regularFields).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Additional Information</p>
              </div>
              {Object.entries(regularFields).map(([key, value]) => (
                <div key={key} className="pl-6">
                  <p className="text-xs text-muted-foreground capitalize">
                    {formatFieldName(key)}
                  </p>
                  {renderFieldValue(key, value)}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Document Files */}
        {Object.keys(documentFields).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">Uploaded Documents</p>
              </div>
              {Object.entries(documentFields).map(([key, value]) => (
                <div key={key} className="pl-6 space-y-1">
                  <p className="text-xs text-muted-foreground capitalize">
                    {formatFieldName(key)}
                  </p>
                  {renderFieldValue(key, value)}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default UserInfoSidebar;

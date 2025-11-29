import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminDashboard from "@/components/dashboard/AdminDashboard";
import EmployeeDashboard from "@/components/dashboard/EmployeeDashboard";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const hasAdminRole = roles?.some((r) => r.role === "admin");
      
      // If not admin, check onboarding status
      if (!hasAdminRole) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_status")
          .eq("id", user.id)
          .single();

        // If onboarding not completed, redirect to onboarding
        if (!profile?.onboarding_status || profile.onboarding_status === 'pending' || profile.onboarding_status === 'rejected') {
          navigate("/onboarding");
          return;
        }
        
        // Only allow dashboard access if verified
        if (profile.onboarding_status !== 'verified') {
          navigate("/onboarding");
          return;
        }
      }
      
      setIsAdmin(hasAdminRole || false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading dashboard",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
};

export default Dashboard;

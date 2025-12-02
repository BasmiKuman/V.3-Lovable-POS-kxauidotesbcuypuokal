import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"ready" | "success" | "error">("ready");
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    // Check if this is a password recovery link
    const checkRecoveryToken = async () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');

      if (type === 'recovery' && accessToken) {
        setIsValidToken(true);
        
        // Set the session with the recovery token
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || ''
        });

        if (error) {
          console.error("Error setting session:", error);
          toast.error("Link reset password tidak valid atau sudah kadaluarsa");
          setStatus("error");
          setTimeout(() => navigate("/auth"), 3000);
        }
      } else {
        // No valid recovery token
        toast.error("Link reset password tidak valid");
        setTimeout(() => navigate("/auth"), 2000);
      }
    };

    checkRecoveryToken();
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (newPassword.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Password dan konfirmasi password tidak sama");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setStatus("success");
      toast.success("Password berhasil diubah!");
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Gagal mengubah password");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  if (!isValidToken && status !== "error") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img 
              src="/images/logo.png" 
              alt="Loading" 
              className="w-16 h-16 animate-spin mx-auto mb-4"
            />
            <CardTitle>Memvalidasi Link...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Logo Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="grid grid-cols-6 gap-12 p-12 rotate-12 scale-150">
          {[...Array(36)].map((_, i) => (
            <img 
              key={i}
              src="/images/logo.png" 
              alt="" 
              className="w-16 h-16 opacity-20"
            />
          ))}
        </div>
      </div>

      <Card className="w-full max-w-md shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto">
            {status === "ready" && (
              <img 
                src="/images/logo.png" 
                alt="Logo" 
                className="w-16 h-16 mx-auto"
              />
            )}
            {status === "success" && (
              <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce mx-auto" />
            )}
            {status === "error" && (
              <AlertCircle className="w-16 h-16 text-destructive mx-auto" />
            )}
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {status === "ready" && "Reset Password"}
            {status === "success" && "Password Berhasil Diubah! 🎉"}
            {status === "error" && "Reset Password Gagal"}
          </CardTitle>
          
          <CardDescription className="text-base">
            {status === "ready" && "Masukkan password baru Anda"}
            {status === "success" && "Anda akan diarahkan ke halaman login..."}
            {status === "error" && "Terjadi kesalahan. Silakan coba lagi."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "ready" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Password Baru</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ketik ulang password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loading}
              >
                {loading ? (
                  <img 
                    src="/images/logo.png" 
                    alt="Loading" 
                    className="w-4 h-4 animate-spin"
                  />
                ) : (
                  "Ubah Password"
                )}
              </Button>
            </form>
          )}

          {status === "success" && (
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-200">
              <p className="font-semibold mb-2">✓ Password berhasil diubah</p>
              <p>Silakan login dengan password baru Anda.</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
                <p className="font-semibold mb-2">Saran:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Link mungkin sudah kadaluarsa</li>
                  <li>Coba minta link reset password baru</li>
                  <li>Pastikan Anda membuka link terbaru dari email</li>
                </ul>
              </div>
              
              <Button 
                onClick={() => navigate("/auth")} 
                variant="outline"
                className="w-full"
              >
                Kembali ke Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

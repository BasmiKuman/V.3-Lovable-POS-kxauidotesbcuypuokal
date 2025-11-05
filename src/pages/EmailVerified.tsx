import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function EmailVerified() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        // Check if there's a hash in the URL (from email confirmation link)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');

        if (type === 'signup' && accessToken) {
          // User clicked email verification link
          setStatus("success");
          setMessage("Email Anda telah berhasil diverifikasi!");
          
          // Optional: Auto sign in the user
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: hashParams.get('refresh_token') || ''
          });

          if (error) {
            console.error("Error setting session:", error);
          }
        } else if (type === 'recovery') {
          // Password recovery link
          setStatus("success");
          setMessage("Link verifikasi valid. Silakan reset password Anda.");
          // Redirect to password reset page if you have one
          setTimeout(() => navigate("/auth"), 3000);
        } else {
          // No verification parameters found
          const { data: { user } } = await supabase.auth.getUser();
          
          if (user?.email_confirmed_at) {
            setStatus("success");
            setMessage("Email Anda sudah terverifikasi!");
          } else if (user) {
            setStatus("error");
            setMessage("Email Anda belum diverifikasi. Silakan cek inbox email Anda.");
          } else {
            setStatus("error");
            setMessage("Link verifikasi tidak valid atau sudah kadaluarsa.");
          }
        }
      } catch (error) {
        console.error("Verification error:", error);
        setStatus("error");
        setMessage("Terjadi kesalahan saat memverifikasi email.");
      }
    };

    handleEmailVerification();
  }, [navigate]);

  const handleLoginRedirect = async () => {
    // Check if user already logged in (from email verification)
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // User already logged in, redirect based on role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      const redirectPath = roles ? "/dashboard" : "/pos";
      navigate(redirectPath, { replace: true });
    } else {
      // Not logged in, go to auth page
      navigate("/auth", { replace: true });
    }
  };

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
            {status === "loading" && (
              <img 
                src="/images/logo.png" 
                alt="Loading" 
                className="w-16 h-16 animate-spin mx-auto"
              />
            )}
            {status === "success" && (
              <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
            )}
            {status === "error" && (
              <AlertCircle className="w-16 h-16 text-destructive" />
            )}
          </div>
          
          <CardTitle className="text-2xl font-bold">
            {status === "loading" && "Memverifikasi Email..."}
            {status === "success" && "Verifikasi Berhasil! 🎉"}
            {status === "error" && "Verifikasi Gagal"}
          </CardTitle>
          
          <CardDescription className="text-base">
            {status === "loading" && "Mohon tunggu sebentar..."}
            {message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "success" && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm text-green-800 dark:text-green-200">
                <p className="font-semibold mb-2">✓ Email terverifikasi</p>
                <p>Sekarang Anda dapat login ke aplikasi dengan akun yang telah didaftarkan.</p>
              </div>
              
              <Button 
                onClick={handleLoginRedirect} 
                className="w-full"
                size="lg"
              >
                Login Sekarang
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm">
                <p className="font-semibold mb-2">Saran:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Cek email Anda dan klik link verifikasi terbaru</li>
                  <li>Link mungkin sudah kadaluarsa, minta kirim ulang</li>
                  <li>Pastikan Anda membuka link dari email yang benar</li>
                </ul>
              </div>
              
              <Button 
                onClick={handleLoginRedirect} 
                variant="outline"
                className="w-full"
              >
                Kembali ke Login
              </Button>
            </div>
          )}

          {status === "loading" && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Sedang memproses verifikasi email Anda...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

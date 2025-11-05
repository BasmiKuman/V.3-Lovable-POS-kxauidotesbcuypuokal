import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import TermsAndConditions from "@/components/TermsAndConditions";
import { saveGPSConsent } from "@/lib/gps-tracking";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [pendingSignupData, setPendingSignupData] = useState<any>(null);
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Signup fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupAddress, setSignupAddress] = useState("");
  
  // Forgot password
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      // Check if this is a password recovery link
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const type = hashParams.get('type');
      
      // If it's a recovery link, redirect to reset password page
      if (type === 'recovery') {
        navigate('/reset-password', { replace: true });
        return;
      }
      
      // Otherwise, check session and redirect if logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const from = (location.state as any)?.from?.pathname || "/dashboard";
        navigate(from, { replace: true });
      }
    };
    checkUser();
  }, [navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      if (data.session) {
        // Check if user is admin
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.session.user.id)
          .eq("role", "admin")
          .maybeSingle();

        const redirectPath = roles ? "/dashboard" : "/pos";
        toast.success("Login berhasil!");
        navigate(redirectPath, { replace: true });
      }
    } catch (error: any) {
      toast.error(error.message || "Login gagal");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!signupPhone || signupPhone.length < 10) {
      toast.error("Nomor handphone minimal 10 digit");
      return;
    }
    
    if (!signupAddress || signupAddress.trim().length < 10) {
      toast.error("Alamat harus diisi minimal 10 karakter");
      return;
    }
    
    // Store data and show Terms & Conditions
    setPendingSignupData({
      email: signupEmail,
      password: signupPassword,
      name: signupName,
      phone: signupPhone,
      address: signupAddress,
    });
    setShowTerms(true);
  };

  const handleAcceptTerms = async () => {
    if (!pendingSignupData) return;
    
    setLoading(true);
    setShowTerms(false);

    try {
      // Use environment variable or fallback to window.location.origin
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      
      const { data, error } = await supabase.auth.signUp({
        email: pendingSignupData.email,
        password: pendingSignupData.password,
        options: {
          data: {
            full_name: pendingSignupData.name,
            phone: pendingSignupData.phone,
            address: pendingSignupData.address,
          },
          emailRedirectTo: `${appUrl}/email-verified`,
        },
      });

      if (error) throw error;

      if (data.user) {
        // Profile, role, and GPS settings are automatically created by handle_new_user trigger
        // Just save GPS consent (user accepted T&C)
        await saveGPSConsent(data.user.id);
      }

      toast.success("Pendaftaran berhasil! Silakan cek email untuk verifikasi.");
      
      // Clear form
      setSignupEmail("");
      setSignupPassword("");
      setSignupName("");
      setSignupPhone("");
      setSignupAddress("");
      setPendingSignupData(null);
      
      // Auto login after signup if session exists
      if (data.session) {
        navigate("/pos", { replace: true });
      }
    } catch (error: any) {
      if (error.message.includes("already registered")) {
        toast.error("Email sudah terdaftar");
      } else {
        toast.error(error.message || "Pendaftaran gagal");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeclineTerms = () => {
    setShowTerms(false);
    setPendingSignupData(null);
    toast.info("Anda harus menyetujui syarat & ketentuan untuk mendaftar");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use environment variable or fallback to window.location.origin
      const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${appUrl}/reset-password`,
      });

      if (error) throw error;

      toast.success("Email reset password telah dikirim! Silakan cek inbox Anda.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (error: any) {
      toast.error(error.message || "Gagal mengirim email reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-4 relative overflow-hidden">
      {/* Terms & Conditions Modal */}
      <TermsAndConditions
        open={showTerms}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
      />

      {/* Logo Pattern Background */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="grid grid-cols-8 gap-8 p-8 rotate-12 scale-150">
          {[...Array(64)].map((_, i) => (
            <img 
              key={i}
              src="/images/logo.png" 
              alt="" 
              className="w-16 h-16 opacity-30 animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md shadow-2xl relative z-10 border-2 max-h-[90vh] flex flex-col">
        <CardHeader className="space-y-2 text-center pb-4 flex-shrink-0">
          <div className="flex justify-center mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-600 rounded-2xl blur-xl opacity-50 animate-pulse"></div>
              <img 
                src="/images/logo.png" 
                alt="BK Logo" 
                className="w-16 h-16 relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              BK POS System
            </CardTitle>
            <p className="text-[10px] text-muted-foreground mt-0.5">by BasmiKuman</p>
          </div>
          <CardDescription className="text-xs">
            Manajemen Gudang & Distribusi Terintegrasi
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-y-auto flex-1">
          {showForgotPassword ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Lupa Password</h3>
                <p className="text-sm text-muted-foreground">
                  Masukkan email Anda untuk menerima link reset password
                </p>
              </div>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowForgotPassword(false)}
                    disabled={loading}
                  >
                    Kembali
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading && (
                      <img 
                        src="/images/logo.png" 
                        alt="" 
                        className="mr-2 h-4 w-4 animate-spin"
                      />
                    )}
                    Kirim Link Reset
                  </Button>
                </div>
              </form>
            </div>
          ) : (
          <Tabs defaultValue="login" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-primary hover:underline"
                  >
                    Lupa password?
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && (
                    <img 
                      src="/images/logo.png" 
                      alt="" 
                      className="mr-2 h-4 w-4 animate-spin"
                    />
                  )}
                  Masuk
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="signup-name" className="text-sm">Nama Lengkap *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Nama Lengkap Anda"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    required
                    disabled={loading}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-sm">Email *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="nama@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-phone" className="text-sm">Nomor Handphone *</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="08123456789"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    required
                    disabled={loading}
                    minLength={10}
                    maxLength={15}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-address" className="text-sm">Alamat Lengkap *</Label>
                  <Textarea
                    id="signup-address"
                    placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                    value={signupAddress}
                    onChange={(e) => setSignupAddress(e.target.value)}
                    required
                    disabled={loading}
                    rows={2}
                    minLength={10}
                    className="text-sm resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-sm">Password *</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      required
                      disabled={loading}
                      minLength={6}
                      className="pr-10 h-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showSignupPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="pt-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && (
                      <img 
                        src="/images/logo.png" 
                        alt="" 
                        className="mr-2 h-4 w-4 animate-spin"
                      />
                    )}
                    Daftar sebagai Rider
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Footer Branding - Enhanced Visibility */}
      <div className="fixed bottom-0 left-0 right-0 py-3 bg-gradient-to-t from-slate-100/90 via-slate-50/80 to-transparent dark:from-slate-950/90 dark:via-slate-900/80 backdrop-blur-sm z-20">
        <div className="text-center space-y-1 px-4">
          <p className="text-sm font-medium text-foreground drop-shadow-sm">
            © 2025 <span className="font-bold text-primary">BasmiKuman</span> - <span className="font-semibold">BK POS System</span>
          </p>
          <p className="text-xs text-muted-foreground drop-shadow-sm">
            Manajemen Gudang & Distribusi Terintegrasi
          </p>
        </div>
      </div>
    </div>
  );
}

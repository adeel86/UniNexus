import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FcGoogle } from "react-icons/fc";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface LoginFormProps {
  onSignUpClick?: () => void;
}

export function LoginForm({ onSignUpClick }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();

  const handleLogin = async () => {
    // Email/password login will be implemented in backend
    toast({
      title: "Email login coming soon",
      description: "Please use Google sign-in for now",
    });
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle();
      // User will be redirected and handled by auth state change
    } catch (error: any) {
      console.error("Google sign-in error:", error);
      
      let errorMessage = "Failed to sign in with Google";
      
      // Handle specific Firebase errors
      if (error.code === 'auth/popup-blocked') {
        errorMessage = "Popup was blocked. Please allow popups for this site and try again.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = "Sign-in was cancelled. Please try again.";
      } else if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "This domain is not authorized. Please contact support.";
      } else if (error.code === 'auth/cancelled-popup-request') {
        errorMessage = "Another sign-in popup is already open.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="rounded-2xl p-8 backdrop-blur-xl bg-card/80 border-2" data-testid="card-login">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-display font-bold bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent mb-2">
          Welcome Back
        </h2>
        <p className="text-muted-foreground">Sign in to continue your journey</p>
      </div>

      <div className="space-y-4">
        <Button
          variant="outline"
          className="w-full gap-2 rounded-full"
          onClick={handleGoogleLogin}
          data-testid="button-google-login"
        >
          <FcGoogle className="h-5 w-5" />
          Continue with Google
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="you@university.ac.uk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 rounded-xl"
                data-testid="input-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 rounded-xl"
                data-testid="input-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <Button
          className="w-full rounded-full bg-gradient-to-r from-primary to-chart-2"
          onClick={handleLogin}
          data-testid="button-login"
        >
          Sign In
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <button
            onClick={onSignUpClick}
            className="text-primary font-medium hover:underline"
            data-testid="button-signup-link"
          >
            Sign up
          </button>
        </p>
      </div>
    </Card>
  );
}

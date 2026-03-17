import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResetPasswordPageProps {
  params: {
    oobCode?: string;
  };
}

export default function ResetPassword({ params }: any) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get the reset code from URL query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const oobCode = urlParams.get("oobCode") || params?.oobCode;

  useEffect(() => {
    const verifyResetCode = async () => {
      if (!oobCode) {
        setVerificationError("Invalid reset link. Please request a new password reset.");
        setIsVerifying(false);
        return;
      }

      try {
        // Verify the reset code is valid
        const email = await verifyPasswordResetCode(auth, oobCode);
        setUserEmail(email);
        setIsVerifying(false);
      } catch (error: any) {
        console.error("Reset code verification failed:", error);
        setVerificationError(
          error.code === "auth/invalid-action-code"
            ? "This password reset link has expired or is invalid. Please request a new one."
            : error.message || "Failed to verify reset link."
        );
        setIsVerifying(false);
      }
    };

    verifyResetCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please enter and confirm your new password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation must match.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (!oobCode) {
        throw new Error("Reset code not found");
      }

      // Confirm the password reset with Firebase
      await confirmPasswordReset(auth, oobCode, newPassword);

      setResetSuccess(true);
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation("/login");
      }, 2000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast({
        title: "Reset failed",
        description:
          error.code === "auth/expired-action-code"
            ? "This password reset link has expired. Please request a new one."
            : error.message || "Failed to reset password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verifying Reset Link</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Please wait while we verify your reset link...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationError || resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {resetSuccess ? (
                <>
                  <CheckCircle className="text-green-600" />
                  Password Reset Complete
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-600" />
                  Reset Link Invalid
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resetSuccess ? (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your password has been successfully updated. Redirecting to login...
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">{verificationError}</AlertDescription>
                </Alert>
                <Button onClick={() => setLocation("/forgot-password")} className="w-full">
                  Request New Reset Link
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>
            {userEmail && `Resetting password for: ${userEmail}`}
            {!userEmail && "Enter your new password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => setLocation("/login")}
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

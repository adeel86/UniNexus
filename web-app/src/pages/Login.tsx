import { useEffect, useState } from "react";
import { LoginForm } from "@/components/LoginForm";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@assets/stock_images/diverse_group_of_uni_745428a2.jpg";

export default function Login() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingUser, setCheckingUser] = useState(false);
  const [userChecked, setUserChecked] = useState(false);

  useEffect(() => {
    // Check if logged-in user exists in database (only once)
    if (user && !userChecked && !checkingUser && !showOnboarding) {
      setCheckingUser(true);
      
      fetch(`/api/auth/user/${user.uid}`)
        .then(async (response) => {
          if (response.ok) {
            // User exists in database, redirect to home
            setLocation("/");
          } else {
            // User doesn't exist, show onboarding
            setShowOnboarding(true);
          }
        })
        .catch((error) => {
          console.error("Error checking user:", error);
          // If error, show onboarding to be safe
          setShowOnboarding(true);
        })
        .finally(() => {
          setCheckingUser(false);
          setUserChecked(true);
        });
    }
  }, [user, userChecked, checkingUser, showOnboarding, setLocation]);

  useEffect(() => {
    if (!loading && user && !showOnboarding && !checkingUser) {
      setLocation("/");
    }
  }, [user, loading, showOnboarding, checkingUser, setLocation]);

  const handleOnboardingComplete = () => {
    setLocation("/");
  };

  const handleSignUpClick = () => {
    setShowOnboarding(true);
  };

  if (loading || checkingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="relative hidden md:block">
        <img 
          src={heroImage} 
          alt="Students collaborating" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-chart-2/80 to-chart-3/90 flex items-center justify-center p-12">
          <div className="text-white text-center">
            <h1 className="text-5xl font-display font-bold mb-4">
              Welcome to UniNexus
            </h1>
            <p className="text-xl opacity-90 max-w-md mx-auto">
              Connect with students, share knowledge, and build your professional network
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-md">
          <div className="md:hidden text-center mb-8">
            <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-primary via-chart-2 to-chart-3 bg-clip-text text-transparent mb-2">
              UniNexus
            </h1>
            <p className="text-muted-foreground">Your student community awaits</p>
          </div>
          
          <LoginForm onSignUpClick={handleSignUpClick} />
        </div>
      </div>
    </div>
  );
}

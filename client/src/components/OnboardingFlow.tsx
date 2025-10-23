import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { User, GraduationCap, Sparkles, CheckCircle } from "lucide-react";
import { auth } from "@/lib/firebase";

interface OnboardingFlowProps {
  onComplete?: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState("");
  const [university, setUniversity] = useState("");
  const [course, setCourse] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [bio, setBio] = useState("");

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  const availableInterests = [
    "Web Development", "Machine Learning", "Mobile Apps", "Data Science",
    "Cybersecurity", "Cloud Computing", "UI/UX Design", "Blockchain"
  ];

  const toggleInterest = (interest: string) => {
    setInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Complete onboarding - save to backend
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        console.error("No Firebase user found");
        alert("Authentication error. Please try signing in again.");
        return;
      }

      console.log("Completing onboarding for user:", firebaseUser.uid);
      console.log("User data:", {
        role,
        university,
        course,
        bio,
        interests,
      });

      // Register user in backend database
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "",
          photoURL: firebaseUser.photoURL || "",
          role,
          university,
          course,
          bio,
          interests,
          skills: interests,
          onboarded: true,
        }),
      });

      console.log("Registration response status:", response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Registration error:", error);
        throw new Error(error.error || "Failed to register user");
      }

      const userData = await response.json();
      console.log("Registration successful:", userData);

      // Call onComplete callback
      if (onComplete) {
        console.log("Calling onComplete callback");
        onComplete();
      } else {
        console.log("No onComplete callback provided");
      }
    } catch (error: any) {
      console.error("Error completing onboarding:", error);
      alert(`Failed to complete onboarding: ${error.message}. Please try again.`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto" data-testid="onboarding-flow">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-display font-bold">Complete Your Profile</h2>
          <span className="text-sm text-muted-foreground">Step {step} of {totalSteps}</span>
        </div>
        <Progress value={progress} className="h-2" data-testid="progress-onboarding" />
      </div>

      {step === 1 && (
        <Card className="rounded-2xl p-8" data-testid="step-role">
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-display font-semibold mb-2">What's your role?</h3>
            <p className="text-muted-foreground">Help us personalize your experience</p>
          </div>

          <div className="space-y-3">
            {["Student", "Lecturer", "Recruiter"].map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`w-full p-4 rounded-xl border-2 transition-all hover-elevate ${
                  role === r
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
                data-testid={`button-role-${r.toLowerCase()}`}
              >
                <p className="font-semibold">{r}</p>
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="rounded-2xl p-8" data-testid="step-university">
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-chart-2 to-chart-3 flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-display font-semibold mb-2">Academic Details</h3>
            <p className="text-muted-foreground">Tell us about your university and course</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="university">University</Label>
              <Select value={university} onValueChange={setUniversity}>
                <SelectTrigger className="rounded-xl" data-testid="select-university">
                  <SelectValue placeholder="Select your university" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oxford">University of Oxford</SelectItem>
                  <SelectItem value="cambridge">University of Cambridge</SelectItem>
                  <SelectItem value="imperial">Imperial College London</SelectItem>
                  <SelectItem value="ucl">UCL</SelectItem>
                  <SelectItem value="edinburgh">University of Edinburgh</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="course">Course</Label>
              <Input
                id="course"
                placeholder="e.g., Computer Science"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="rounded-xl"
                data-testid="input-course"
              />
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="rounded-2xl p-8" data-testid="step-interests">
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-chart-3 to-primary flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-display font-semibold mb-2">Your Interests</h3>
            <p className="text-muted-foreground">Select topics you're passionate about</p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            {availableInterests.map((interest) => (
              <Badge
                key={interest}
                variant={interests.includes(interest) ? "default" : "outline"}
                className="cursor-pointer px-4 py-2 rounded-full"
                onClick={() => toggleInterest(interest)}
                data-testid={`badge-interest-${interest.toLowerCase().replace(/\s/g, '-')}`}
              >
                {interest}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {step === 4 && (
        <Card className="rounded-2xl p-8" data-testid="step-bio">
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary via-chart-2 to-chart-3 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-display font-semibold mb-2">Almost Done!</h3>
            <p className="text-muted-foreground">Write a short bio about yourself</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder="Tell us about yourself, your goals, and what you're looking to achieve..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="min-h-[150px] rounded-xl"
              data-testid="textarea-bio"
            />
            <p className="text-xs text-muted-foreground">{bio.length}/300 characters</p>
          </div>
        </Card>
      )}

      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="rounded-full"
            data-testid="button-back"
          >
            Back
          </Button>
        )}
        <Button
          onClick={handleNext}
          className="flex-1 rounded-full bg-gradient-to-r from-primary to-chart-2"
          data-testid="button-next"
        >
          {step === totalSteps ? "Complete" : "Next"}
        </Button>
      </div>
    </div>
  );
}

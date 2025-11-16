import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@shared/schema";

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userRole: string;
}

export function EditProfileModal({ open, onOpenChange, userId, userRole }: EditProfileModalProps) {
  const { toast } = useToast();

  const { data: profile } = useQuery<UserProfile>({
    queryKey: [`/api/user-profiles/${userId}`],
    enabled: open,
  });

  const [formData, setFormData] = useState({
    programme: "",
    yearOfStudy: "",
    academicGoals: "",
    careerGoals: "",
    teachingSubjects: "",
    specializations: "",
    professionalBio: "",
    department: "",
    officeHours: "",
    universityMission: "",
    focusAreas: "",
    opportunitiesOffered: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    companyMission: "",
    industryFocus: "",
    partnershipOpportunities: "",
    hiringOpportunities: "",
  });

  // Sync form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        programme: profile.programme || "",
        yearOfStudy: profile.yearOfStudy?.toString() || "",
        academicGoals: profile.academicGoals || "",
        careerGoals: profile.careerGoals || "",
        teachingSubjects: profile.teachingSubjects?.join(", ") || "",
        specializations: profile.specializations?.join(", ") || "",
        professionalBio: profile.professionalBio || "",
        department: profile.department || "",
        officeHours: profile.officeHours || "",
        universityMission: profile.universityMission || "",
        focusAreas: profile.focusAreas?.join(", ") || "",
        opportunitiesOffered: profile.opportunitiesOffered || "",
        contactEmail: profile.contactEmail || "",
        contactPhone: profile.contactPhone || "",
        website: profile.website || "",
        companyMission: profile.companyMission || "",
        industryFocus: profile.industryFocus?.join(", ") || "",
        partnershipOpportunities: profile.partnershipOpportunities || "",
        hiringOpportunities: profile.hiringOpportunities || "",
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {};

      if (userRole === "student") {
        payload.programme = formData.programme;
        payload.yearOfStudy = formData.yearOfStudy ? parseInt(formData.yearOfStudy) : null;
        payload.academicGoals = formData.academicGoals;
        payload.careerGoals = formData.careerGoals;
      } else if (userRole === "teacher") {
        payload.teachingSubjects = formData.teachingSubjects.split(",").map(s => s.trim()).filter(Boolean);
        payload.specializations = formData.specializations.split(",").map(s => s.trim()).filter(Boolean);
        payload.professionalBio = formData.professionalBio;
        payload.department = formData.department;
        payload.officeHours = formData.officeHours;
      } else if (userRole === "university_admin") {
        payload.universityMission = formData.universityMission;
        payload.focusAreas = formData.focusAreas.split(",").map(s => s.trim()).filter(Boolean);
        payload.opportunitiesOffered = formData.opportunitiesOffered;
        payload.contactEmail = formData.contactEmail;
        payload.contactPhone = formData.contactPhone;
        payload.website = formData.website;
      } else if (userRole === "industry_professional") {
        payload.companyMission = formData.companyMission;
        payload.industryFocus = formData.industryFocus.split(",").map(s => s.trim()).filter(Boolean);
        payload.partnershipOpportunities = formData.partnershipOpportunities;
        payload.hiringOpportunities = formData.hiringOpportunities;
      }

      return apiRequest("POST", "/api/user-profiles", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/user-profiles/${userId}`] });
      toast({ title: "Profile updated successfully!" });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile Information</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {userRole === "student" && (
            <>
              <div>
                <Label htmlFor="programme">Degree Programme</Label>
                <Input
                  id="programme"
                  value={formData.programme}
                  onChange={(e) => handleChange("programme", e.target.value)}
                  placeholder="e.g., BSc Computer Science"
                  data-testid="input-programme"
                />
              </div>
              <div>
                <Label htmlFor="yearOfStudy">Year of Study</Label>
                <Input
                  id="yearOfStudy"
                  type="number"
                  value={formData.yearOfStudy}
                  onChange={(e) => handleChange("yearOfStudy", e.target.value)}
                  placeholder="e.g., 2"
                  data-testid="input-year-of-study"
                />
              </div>
              <div>
                <Label htmlFor="academicGoals">Academic Goals</Label>
                <Textarea
                  id="academicGoals"
                  value={formData.academicGoals}
                  onChange={(e) => handleChange("academicGoals", e.target.value)}
                  placeholder="What are your academic goals?"
                  data-testid="textarea-academic-goals"
                />
              </div>
              <div>
                <Label htmlFor="careerGoals">Career Goals</Label>
                <Textarea
                  id="careerGoals"
                  value={formData.careerGoals}
                  onChange={(e) => handleChange("careerGoals", e.target.value)}
                  placeholder="What are your career aspirations?"
                  data-testid="textarea-career-goals"
                />
              </div>
            </>
          )}

          {userRole === "teacher" && (
            <>
              <div>
                <Label htmlFor="teachingSubjects">Teaching Subjects</Label>
                <Input
                  id="teachingSubjects"
                  value={formData.teachingSubjects}
                  onChange={(e) => handleChange("teachingSubjects", e.target.value)}
                  placeholder="e.g., Machine Learning, Data Structures, Algorithms"
                  data-testid="input-teaching-subjects"
                />
                <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
              </div>
              <div>
                <Label htmlFor="specializations">Specializations</Label>
                <Input
                  id="specializations"
                  value={formData.specializations}
                  onChange={(e) => handleChange("specializations", e.target.value)}
                  placeholder="e.g., AI, Computer Vision, NLP"
                  data-testid="input-specializations"
                />
                <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  placeholder="e.g., Computer Science"
                  data-testid="input-department"
                />
              </div>
              <div>
                <Label htmlFor="professionalBio">Professional Biography</Label>
                <Textarea
                  id="professionalBio"
                  value={formData.professionalBio}
                  onChange={(e) => handleChange("professionalBio", e.target.value)}
                  placeholder="Tell us about your teaching philosophy and experience..."
                  rows={4}
                  data-testid="textarea-professional-bio"
                />
              </div>
              <div>
                <Label htmlFor="officeHours">Office Hours</Label>
                <Input
                  id="officeHours"
                  value={formData.officeHours}
                  onChange={(e) => handleChange("officeHours", e.target.value)}
                  placeholder="e.g., Mon/Wed 2-4pm, Fri 10am-12pm"
                  data-testid="input-office-hours"
                />
              </div>
            </>
          )}

          {userRole === "university_admin" && (
            <>
              <div>
                <Label htmlFor="universityMission">Mission Statement</Label>
                <Textarea
                  id="universityMission"
                  value={formData.universityMission}
                  onChange={(e) => handleChange("universityMission", e.target.value)}
                  placeholder="Your university's mission and vision..."
                  rows={4}
                  data-testid="textarea-university-mission"
                />
              </div>
              <div>
                <Label htmlFor="focusAreas">Focus Areas</Label>
                <Input
                  id="focusAreas"
                  value={formData.focusAreas}
                  onChange={(e) => handleChange("focusAreas", e.target.value)}
                  placeholder="e.g., STEM, Research, Innovation"
                  data-testid="input-focus-areas"
                />
                <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
              </div>
              <div>
                <Label htmlFor="opportunitiesOffered">Opportunities Offered</Label>
                <Textarea
                  id="opportunitiesOffered"
                  value={formData.opportunitiesOffered}
                  onChange={(e) => handleChange("opportunitiesOffered", e.target.value)}
                  placeholder="Scholarships, programs, facilities, etc."
                  data-testid="textarea-opportunities-offered"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => handleChange("contactEmail", e.target.value)}
                  placeholder="admissions@university.edu"
                  data-testid="input-contact-email"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => handleChange("contactPhone", e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  data-testid="input-contact-phone"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleChange("website", e.target.value)}
                  placeholder="https://university.edu"
                  data-testid="input-website"
                />
              </div>
            </>
          )}

          {userRole === "industry_professional" && (
            <>
              <div>
                <Label htmlFor="companyMission">Company Mission</Label>
                <Textarea
                  id="companyMission"
                  value={formData.companyMission}
                  onChange={(e) => handleChange("companyMission", e.target.value)}
                  placeholder="Your company's mission and values..."
                  rows={4}
                  data-testid="textarea-company-mission"
                />
              </div>
              <div>
                <Label htmlFor="industryFocus">Industry Focus</Label>
                <Input
                  id="industryFocus"
                  value={formData.industryFocus}
                  onChange={(e) => handleChange("industryFocus", e.target.value)}
                  placeholder="e.g., AI, FinTech, Healthcare"
                  data-testid="input-industry-focus"
                />
                <p className="text-xs text-muted-foreground mt-1">Separate with commas</p>
              </div>
              <div>
                <Label htmlFor="partnershipOpportunities">Partnership Opportunities</Label>
                <Textarea
                  id="partnershipOpportunities"
                  value={formData.partnershipOpportunities}
                  onChange={(e) => handleChange("partnershipOpportunities", e.target.value)}
                  placeholder="Research collaborations, internships, projects..."
                  data-testid="textarea-partnership-opportunities"
                />
              </div>
              <div>
                <Label htmlFor="hiringOpportunities">Hiring Opportunities</Label>
                <Textarea
                  id="hiringOpportunities"
                  value={formData.hiringOpportunities}
                  onChange={(e) => handleChange("hiringOpportunities", e.target.value)}
                  placeholder="Open positions, graduate programs, internships..."
                  data-testid="textarea-hiring-opportunities"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-edit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
            data-testid="button-save-profile"
          >
            {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

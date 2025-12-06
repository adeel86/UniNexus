import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GraduationCap, Briefcase, Globe, Mail, Phone, Plus, Edit, Trash2 } from "lucide-react";
import type { UserProfile, User } from "@shared/schema";

interface StudentAcademicInfoProps {
  extendedProfile: UserProfile;
}

export function StudentAcademicInfo({ extendedProfile }: StudentAcademicInfoProps) {
  if (!extendedProfile.programme && !extendedProfile.academicGoals && !extendedProfile.careerGoals) {
    return null;
  }

  return (
    <Card className="p-6 mt-6">
      <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
        <GraduationCap className="h-5 w-5 text-blue-600" />
        Academic Information
      </h2>
      <div className="space-y-3">
        {extendedProfile.programme && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Programme</h3>
            <p>{extendedProfile.programme}</p>
          </div>
        )}
        {extendedProfile.yearOfStudy && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Year of Study</h3>
            <p>Year {extendedProfile.yearOfStudy}</p>
          </div>
        )}
        {extendedProfile.academicGoals && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Academic Goals</h3>
            <p className="whitespace-pre-wrap">{extendedProfile.academicGoals}</p>
          </div>
        )}
        {extendedProfile.careerGoals && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Career Goals</h3>
            <p className="whitespace-pre-wrap">{extendedProfile.careerGoals}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

interface TeachingProfileProps {
  extendedProfile: UserProfile;
}

export function TeachingProfile({ extendedProfile }: TeachingProfileProps) {
  if (!extendedProfile.teachingSubjects && !extendedProfile.professionalBio && !extendedProfile.specializations) {
    return null;
  }

  return (
    <Card className="p-6 mt-6">
      <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-purple-600" />
        Teaching Profile
      </h2>
      <div className="space-y-3">
        {extendedProfile.department && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Department</h3>
            <p>{extendedProfile.department}</p>
          </div>
        )}
        {extendedProfile.teachingSubjects && extendedProfile.teachingSubjects.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Teaching Subjects</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {extendedProfile.teachingSubjects.map((subject, i) => (
                <Badge key={i} variant="secondary">{subject}</Badge>
              ))}
            </div>
          </div>
        )}
        {extendedProfile.specializations && extendedProfile.specializations.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Specializations</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {extendedProfile.specializations.map((spec, i) => (
                <Badge key={i} variant="outline">{spec}</Badge>
              ))}
            </div>
          </div>
        )}
        {extendedProfile.professionalBio && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Professional Biography</h3>
            <p className="whitespace-pre-wrap">{extendedProfile.professionalBio}</p>
          </div>
        )}
        {extendedProfile.officeHours && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Office Hours</h3>
            <p>{extendedProfile.officeHours}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

interface ProfessionalExperienceProps {
  jobExperiences: any[];
  isViewingOwnProfile: boolean;
  onAddExperience: () => void;
  onEditExperience: (exp: any) => void;
  onDeleteExperience: (id: number) => void;
}

export function ProfessionalExperience({
  jobExperiences,
  isViewingOwnProfile,
  onAddExperience,
  onEditExperience,
  onDeleteExperience,
}: ProfessionalExperienceProps) {
  if (jobExperiences.length === 0 && !isViewingOwnProfile) {
    return null;
  }

  return (
    <Card className="p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading text-xl font-semibold flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-blue-600" />
          Professional Experience
        </h2>
        {isViewingOwnProfile && (
          <Button
            variant="outline"
            size="sm"
            onClick={onAddExperience}
            data-testid="button-add-job-experience"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Experience
          </Button>
        )}
      </div>
      {jobExperiences.length > 0 ? (
        <div className="space-y-4">
          {jobExperiences.map((exp, index) => (
            <div key={exp.id || index} className="border-l-2 border-muted pl-4 relative group">
              {isViewingOwnProfile && (
                <div className="absolute top-0 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditExperience(exp)}
                    data-testid={`button-edit-job-experience-${exp.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this job experience?')) {
                        onDeleteExperience(exp.id);
                      }
                    }}
                    data-testid={`button-delete-job-experience-${exp.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <h3 className="font-semibold">{exp.position}</h3>
              <p className="text-sm text-muted-foreground">{exp.organization}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {exp.startDate} - {exp.endDate || 'Present'}
                {exp.isCurrent && <Badge variant="secondary" className="ml-2">Current</Badge>}
              </p>
              {exp.description && (
                <p className="text-sm mt-2 whitespace-pre-wrap">{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      ) : isViewingOwnProfile ? (
        <p className="text-sm text-muted-foreground">
          No job experience added yet. Click "Add Experience" to get started.
        </p>
      ) : null}
    </Card>
  );
}

interface UniversityProfileProps {
  extendedProfile: UserProfile;
  universityName?: string | null;
}

export function UniversityProfile({ extendedProfile, universityName }: UniversityProfileProps) {
  if (!extendedProfile.universityMission) {
    return null;
  }

  return (
    <Card className="p-6 mt-6">
      <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
        <Globe className="h-5 w-5 text-green-600" />
        About {universityName || "Our University"}
      </h2>
      <div className="space-y-3">
        {extendedProfile.universityMission && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Mission</h3>
            <p className="whitespace-pre-wrap">{extendedProfile.universityMission}</p>
          </div>
        )}
        {extendedProfile.focusAreas && extendedProfile.focusAreas.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Focus Areas</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {extendedProfile.focusAreas.map((area, i) => (
                <Badge key={i} variant="secondary">{area}</Badge>
              ))}
            </div>
          </div>
        )}
        {extendedProfile.opportunitiesOffered && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Opportunities Offered</h3>
            <p className="whitespace-pre-wrap">{extendedProfile.opportunitiesOffered}</p>
          </div>
        )}
        {(extendedProfile.contactEmail || extendedProfile.contactPhone || extendedProfile.website) && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground mb-2">Contact Information</h3>
            <div className="space-y-1">
              {extendedProfile.contactEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${extendedProfile.contactEmail}`} className="hover:underline">
                    {extendedProfile.contactEmail}
                  </a>
                </div>
              )}
              {extendedProfile.contactPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${extendedProfile.contactPhone}`} className="hover:underline">
                    {extendedProfile.contactPhone}
                  </a>
                </div>
              )}
              {extendedProfile.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={extendedProfile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {extendedProfile.website}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

interface IndustryProfileProps {
  extendedProfile: UserProfile;
  companyName?: string | null;
}

export function IndustryProfile({ extendedProfile, companyName }: IndustryProfileProps) {
  if (!extendedProfile.companyMission) {
    return null;
  }

  return (
    <Card className="p-6 mt-6">
      <h2 className="font-heading text-xl font-semibold mb-4 flex items-center gap-2">
        <Briefcase className="h-5 w-5 text-orange-600" />
        About {companyName || "Our Company"}
      </h2>
      <div className="space-y-3">
        {extendedProfile.companyMission && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Company Mission</h3>
            <p className="whitespace-pre-wrap">{extendedProfile.companyMission}</p>
          </div>
        )}
        {extendedProfile.industryFocus && extendedProfile.industryFocus.length > 0 && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Industry Focus</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {extendedProfile.industryFocus.map((focus, i) => (
                <Badge key={i} variant="secondary">{focus}</Badge>
              ))}
            </div>
          </div>
        )}
        {extendedProfile.partnershipOpportunities && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Partnership Opportunities</h3>
            <p className="whitespace-pre-wrap">{extendedProfile.partnershipOpportunities}</p>
          </div>
        )}
        {extendedProfile.hiringOpportunities && (
          <div>
            <h3 className="font-medium text-sm text-muted-foreground">Hiring Opportunities</h3>
            <p className="whitespace-pre-wrap">{extendedProfile.hiringOpportunities}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

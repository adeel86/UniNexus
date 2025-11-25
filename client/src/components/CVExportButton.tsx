import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";

interface CVExportButtonProps {
  userId: string;
}

interface CVSkill {
  id: string;
  name: string;
  level: string | null;
}

interface CVCourse {
  id: string;
  courseName: string;
  courseCode: string | null;
  institution: string | null;
  instructor: string | null;
  semester: string | null;
  year: number | null;
  grade: string | null;
  description: string | null;
  isValidated: boolean;
  validatedAt: Date | null;
}

interface CVEducation {
  id: string;
  userId: string;
  degree: string;
  institution: string;
  fieldOfStudy: string | null;
  startDate: Date | null;
  endDate: Date | null;
  gpa: string | null;
  description: string | null;
}

interface CVWorkExperience {
  id: string;
  userId: string;
  position: string;
  organization: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
}

interface CVUser {
  id: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  university: string | null;
  bio: string | null;
  role: string;
}

interface CVData {
  user: CVUser;
  education: CVEducation[];
  workExperience: CVWorkExperience[];
  courses: CVCourse[];
  skills: CVSkill[];
}

export function CVExportButton({ userId }: CVExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const { data: cvData, isLoading, error } = useQuery<CVData>({
    queryKey: [`/api/cv-export/${userId}`],
    enabled: isOpen,
  });

  const handleDownload = () => {
    if (!printRef.current || !cvData) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>CV - ${cvData.user?.displayName || cvData.user?.firstName || 'User'}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #6b21a8;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              font-size: 28px;
              color: #1e1e1e;
              margin-bottom: 8px;
            }
            .header p {
              color: #666;
              font-size: 14px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #6b21a8;
              border-bottom: 1px solid #e5e5e5;
              padding-bottom: 8px;
              margin-bottom: 15px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .item {
              margin-bottom: 15px;
            }
            .item-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 4px;
            }
            .item-title {
              font-weight: 600;
              font-size: 14px;
            }
            .item-date {
              font-size: 12px;
              color: #666;
            }
            .item-subtitle {
              font-size: 13px;
              color: #555;
            }
            .item-description {
              font-size: 13px;
              color: #444;
              margin-top: 4px;
            }
            .skills-list {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
            }
            .skill-tag {
              background: #f3e8ff;
              color: #6b21a8;
              padding: 4px 12px;
              border-radius: 15px;
              font-size: 12px;
            }
            .validated-badge {
              color: #16a34a;
              font-size: 11px;
              font-weight: 500;
            }
            @media print {
              body {
                padding: 20px;
              }
            }
          </style>
        </head>
        <body>
          ${printRef.current.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const user = cvData?.user;
  const education = cvData?.education || [];
  const workExperience = cvData?.workExperience || [];
  const courses = cvData?.courses || [];
  const skills = cvData?.skills || [];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-export-cv">
          <Download className="h-4 w-4 mr-2" />
          Export CV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Export CV
          </DialogTitle>
          <DialogDescription>
            Preview your CV below and click download to save it as a document.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>Failed to load CV data. Please try again.</p>
          </div>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <Button onClick={handleDownload} data-testid="button-download-cv">
                <Download className="h-4 w-4 mr-2" />
                Download CV
              </Button>
            </div>
            
            <div ref={printRef} className="bg-white p-6 rounded-md border">
              <div className="header text-center border-b-2 border-purple-700 pb-5 mb-8">
                <h1 className="text-2xl font-bold text-foreground">
                  {user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}
                </h1>
                <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                  {user?.email && <span>{user.email}</span>}
                  {user?.university && <span>{user.university}</span>}
                </div>
              </div>

              {user?.bio && (
                <div className="section mb-6">
                  <h2 className="section-title text-base font-semibold text-purple-700 border-b pb-2 mb-4 uppercase tracking-wider">
                    About
                  </h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user.bio}</p>
                </div>
              )}

              {education.length > 0 && (
                <div className="section mb-6">
                  <h2 className="section-title text-base font-semibold text-purple-700 border-b pb-2 mb-4 uppercase tracking-wider">
                    Education
                  </h2>
                  <div className="space-y-4">
                    {education.map((edu) => (
                      <div key={edu.id} className="item">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-sm">{edu.degree}</h3>
                            <p className="text-sm text-muted-foreground">{edu.institution}</p>
                            {edu.fieldOfStudy && (
                              <p className="text-xs text-muted-foreground">{edu.fieldOfStudy}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(edu.startDate)} - {edu.endDate ? formatDate(edu.endDate) : 'Present'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {workExperience.length > 0 && (
                <div className="section mb-6">
                  <h2 className="section-title text-base font-semibold text-purple-700 border-b pb-2 mb-4 uppercase tracking-wider">
                    Work Experience
                  </h2>
                  <div className="space-y-4">
                    {workExperience.map((exp) => (
                      <div key={exp.id} className="item">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-sm">{exp.position}</h3>
                            <p className="text-sm text-muted-foreground">{exp.organization}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {exp.startDate} - {exp.endDate || 'Present'}
                          </span>
                        </div>
                        {exp.description && (
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {courses.length > 0 && (
                <div className="section mb-6">
                  <h2 className="section-title text-base font-semibold text-purple-700 border-b pb-2 mb-4 uppercase tracking-wider">
                    Courses
                  </h2>
                  <div className="space-y-4">
                    {courses.map((course) => (
                      <div key={course.id} className="item">
                        <div className="flex justify-between items-start gap-2 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-sm">
                              {course.courseName}
                              {course.isValidated && (
                                <span className="ml-2 text-green-600 text-xs font-medium">Verified</span>
                              )}
                            </h3>
                            {course.institution && (
                              <p className="text-sm text-muted-foreground">{course.institution}</p>
                            )}
                            {course.instructor && (
                              <p className="text-xs text-muted-foreground">Instructor: {course.instructor}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {course.semester && course.year && (
                              <span className="text-xs text-muted-foreground">
                                {course.semester} {course.year}
                              </span>
                            )}
                            {course.grade && (
                              <p className="text-xs text-muted-foreground">Grade: {course.grade}</p>
                            )}
                          </div>
                        </div>
                        {course.description && (
                          <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{course.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div className="section mb-6">
                  <h2 className="section-title text-base font-semibold text-purple-700 border-b pb-2 mb-4 uppercase tracking-wider">
                    Skills
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs dark:bg-purple-900/30 dark:text-purple-300"
                      >
                        {skill.name}
                        {skill.level && ` (${skill.level})`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

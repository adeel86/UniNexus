import { Award, Calendar, Shield, ExternalLink, Download, Share2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Certification } from "@shared/schema";
import { format } from "date-fns";
import { useState } from "react";
import { CertificateViewer } from "./CertificateViewer";

interface CertificateShowcaseProps {
  certifications: Certification[];
}

const typeColors = {
  course_completion: "from-blue-500 to-cyan-500",
  project: "from-purple-500 to-pink-500",
  skill_endorsement: "from-green-500 to-emerald-500",
  achievement: "from-yellow-500 to-orange-500",
  custom: "from-gray-500 to-slate-500",
};

const typeLabels = {
  course_completion: "Course Completion",
  project: "Project",
  skill_endorsement: "Skill Endorsement",
  achievement: "Achievement",
  custom: "Custom",
};

export function CertificateShowcase({ certifications }: CertificateShowcaseProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<Certification | null>(null);

  if (certifications.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-heading text-lg font-semibold mb-2">No Certificates Yet</h3>
        <p className="text-sm text-muted-foreground">
          Certificates will appear here as you complete courses, projects, and achievements.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certifications.map((cert) => {
          const isExpired = cert.expiresAt && new Date(cert.expiresAt) < new Date();
          
          return (
            <Card
              key={cert.id}
              className="p-6 hover-elevate cursor-pointer relative overflow-hidden"
              onClick={() => setSelectedCertificate(cert)}
              data-testid={`certificate-${cert.id}`}
            >
              {/* Gradient header */}
              <div
                className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
                  typeColors[cert.type as keyof typeof typeColors] || typeColors.custom
                }`}
              />

              {/* NFT-style badge */}
              <div className="mb-4 relative">
                <div
                  className={`h-32 w-full rounded-lg bg-gradient-to-br ${
                    typeColors[cert.type as keyof typeof typeColors] || typeColors.custom
                  } flex items-center justify-center`}
                >
                  <Shield className="h-16 w-16 text-white opacity-80" />
                </div>
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-black/50 text-white border-0">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                </div>
              </div>

              {/* Certificate info */}
              <div className="space-y-3">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {typeLabels[cert.type as keyof typeof typeLabels] || cert.type}
                  </Badge>
                  <h3 className="font-heading font-semibold text-lg line-clamp-2">
                    {cert.title}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {cert.description}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Award className="h-4 w-4" />
                    <span className="font-medium">{cert.issuerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {cert.issuedAt
                        ? format(new Date(cert.issuedAt), "MMM d, yyyy")
                        : "Date not specified"}
                    </span>
                  </div>
                </div>

                {isExpired && (
                  <Badge variant="destructive" className="w-full justify-center">
                    Expired
                  </Badge>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCertificate(cert);
                    }}
                    data-testid={`button-view-certificate-${cert.id}`}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Certificate Viewer Modal */}
      {selectedCertificate && (
        <CertificateViewer
          certificate={selectedCertificate}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </>
  );
}

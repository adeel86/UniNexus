import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, Award, Calendar, Loader2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface VerificationResult {
  valid: boolean;
  certification?: {
    id: string;
    title: string;
    description: string;
    type: string;
    issuerName: string;
    issuedAt: string;
    expiresAt?: string;
    user: {
      firstName: string;
      lastName: string;
      email?: string;
    };
    issuer: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  error?: string;
}

export default function VerifyCertificate() {
  const params = useParams();
  const hash = params.hash as string;

  const { data, isLoading, error } = useQuery<VerificationResult>({
    queryKey: [`/api/certifications/verify/${hash}`],
    enabled: !!hash,
  });

  if (isLoading) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Card className="p-12 text-center">
          <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-primary" />
          <h2 className="font-heading text-xl font-semibold mb-2">Verifying Certificate</h2>
          <p className="text-muted-foreground">Please wait while we verify the certificate...</p>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Card className="p-12 text-center border-destructive">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h2 className="font-heading text-2xl font-semibold mb-2">Verification Failed</h2>
          <p className="text-muted-foreground mb-6">
            {data?.error || "Unable to verify this certificate. It may not exist or is not publicly accessible."}
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  if (!data.valid || !data.certification) {
    return (
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <Card className="p-12 text-center border-destructive">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
          <h2 className="font-heading text-2xl font-semibold mb-2">Invalid Certificate</h2>
          <p className="text-muted-foreground mb-6">
            This certificate could not be verified. It may have been revoked or does not exist.
          </p>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            Return Home
          </Button>
        </Card>
      </div>
    );
  }

  const cert = data.certification;
  const isExpired = cert.expiresAt && new Date(cert.expiresAt) < new Date();

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      {/* Verification Status Banner */}
      <Card className="mb-8 p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-xl font-semibold text-green-900 dark:text-green-100 mb-1">
              Certificate Verified
            </h2>
            <p className="text-sm text-green-700 dark:text-green-300">
              This is a legitimate certificate issued by {cert.issuerName}
            </p>
          </div>
        </div>
      </Card>

      {/* Expiration Warning */}
      {isExpired && (
        <Card className="mb-8 p-6 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center gap-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            <div>
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">Certificate Expired</h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                This certificate expired on {format(new Date(cert.expiresAt!), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Certificate Details */}
      <Card className="p-8">
        {/* Header */}
        <div className="text-center mb-8 pb-8 border-b">
          <div className="inline-flex items-center justify-center h-20 w-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2">{cert.title}</h1>
          <Badge variant="outline" className="text-sm">
            {cert.type.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h3 className="font-semibold text-sm text-muted-foreground mb-2">Description</h3>
          <p className="text-base">{cert.description}</p>
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Certificate Holder
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold text-lg">
                {cert.user.firstName} {cert.user.lastName}
              </p>
              {cert.user.email && (
                <p className="text-sm text-muted-foreground mt-1">{cert.user.email}</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Issued By
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold text-lg">{cert.issuerName}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {cert.issuer.firstName} {cert.issuer.lastName}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Date Issued
            </h3>
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="font-semibold text-lg">
                {format(new Date(cert.issuedAt), "MMMM d, yyyy")}
              </p>
            </div>
          </div>

          {cert.expiresAt && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {isExpired ? "Expired On" : "Expires On"}
              </h3>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className={`font-semibold text-lg ${isExpired ? "text-destructive" : ""}`}>
                  {format(new Date(cert.expiresAt), "MMMM d, yyyy")}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Verification Hash */}
        <div className="bg-muted/50 p-6 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Blockchain-Style Verification</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            This certificate is secured with a unique cryptographic hash that ensures its authenticity and prevents tampering.
          </p>
          <div className="bg-background p-3 rounded border font-mono text-xs break-all">
            {hash}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            This verification page confirms that the certificate is legitimate and was issued by {cert.issuerName}.
          </p>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-8 border-t">
          <p className="text-sm text-muted-foreground">
            Verified on UniNexus • Blockchain-Secured Certificates
          </p>
        </div>
      </Card>
    </div>
  );
}

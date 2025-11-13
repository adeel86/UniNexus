import { X, Download, Share2, Shield, Award, Calendar, CheckCircle, ExternalLink } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Certification } from "@shared/schema";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

interface CertificateViewerProps {
  certificate: Certification;
  onClose: () => void;
}

const typeColors = {
  course_completion: "from-blue-500 to-cyan-500",
  project: "from-purple-500 to-pink-500",
  skill_endorsement: "from-green-500 to-emerald-500",
  achievement: "from-yellow-500 to-orange-500",
  custom: "from-gray-500 to-slate-500",
};

export function CertificateViewer({ certificate, onClose }: CertificateViewerProps) {
  const { toast } = useToast();
  const baseUrl = window.location.origin;
  const verificationUrl = `${baseUrl}/verify/${certificate.verificationHash}`;

  const handleCopyVerificationLink = () => {
    navigator.clipboard.writeText(verificationUrl);
    toast({
      title: "Link Copied!",
      description: "Verification link copied to clipboard",
    });
  };

  const handleDownload = () => {
    // Create a printable certificate view
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${certificate.title} - Certificate</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Georgia', serif;
              padding: 40px;
              background: white;
            }
            .certificate {
              max-width: 800px;
              margin: 0 auto;
              border: 8px double #333;
              padding: 60px;
              position: relative;
            }
            .certificate-header {
              text-align: center;
              margin-bottom: 40px;
            }
            h1 {
              font-size: 48px;
              color: #333;
              margin-bottom: 20px;
            }
            .subtitle {
              font-size: 20px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 4px;
            }
            .recipient {
              text-align: center;
              margin: 40px 0;
            }
            .recipient-name {
              font-size: 36px;
              color: #000;
              border-bottom: 2px solid #333;
              display: inline-block;
              padding: 10px 60px;
              margin: 20px 0;
            }
            .description {
              text-align: center;
              font-size: 18px;
              line-height: 1.8;
              color: #444;
              margin: 30px 0;
            }
            .details {
              display: flex;
              justify-content: space-around;
              margin-top: 60px;
            }
            .detail-item {
              text-align: center;
            }
            .detail-label {
              font-size: 12px;
              color: #888;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .detail-value {
              font-size: 16px;
              color: #333;
              margin-top: 8px;
              font-weight: bold;
            }
            .verification {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
            }
            .verification-hash {
              font-family: monospace;
              font-size: 10px;
              color: #666;
              word-break: break-all;
            }
            @media print {
              body {
                padding: 0;
              }
              .certificate {
                border: 8px double #333;
              }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="certificate-header">
              <h1>Certificate</h1>
              <div class="subtitle">of ${certificate.type.replace('_', ' ')}</div>
            </div>
            
            <div class="recipient">
              <div style="font-size: 18px; color: #666;">This certifies that</div>
              <div class="recipient-name">Certificate Holder</div>
              <div style="font-size: 18px; color: #666;">has successfully completed</div>
            </div>
            
            <div class="description">
              <strong style="font-size: 24px;">${certificate.title}</strong>
              <p style="margin-top: 20px;">${certificate.description}</p>
            </div>
            
            <div class="details">
              <div class="detail-item">
                <div class="detail-label">Issued By</div>
                <div class="detail-value">${certificate.issuerName}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Date Issued</div>
                <div class="detail-value">${format(new Date(certificate.issuedAt!), "MMMM d, yyyy")}</div>
              </div>
            </div>
            
            <div class="verification">
              <div style="font-size: 14px; color: #666; margin-bottom: 10px;">Verification Hash</div>
              <div class="verification-hash">${certificate.verificationHash}</div>
              <div style="font-size: 12px; color: #888; margin-top: 10px;">
                Verify at: ${verificationUrl}
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);

    toast({
      title: "Certificate Ready",
      description: "Print dialog opened",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: certificate.title,
          text: `Check out my certificate: ${certificate.title}`,
          url: verificationUrl,
        });
      } catch (error) {
        // User cancelled or share failed
        handleCopyVerificationLink();
      }
    } else {
      handleCopyVerificationLink();
    }
  };

  const isExpired = certificate.expiresAt && new Date(certificate.expiresAt) < new Date();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0">
        {/* Header with gradient */}
        <div
          className={`p-8 bg-gradient-to-br ${
            typeColors[certificate.type as keyof typeof typeColors] || typeColors.custom
          } text-white relative`}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            data-testid="button-close-certificate-viewer"
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-4 mb-4">
            <div className="h-20 w-20 bg-white/20 rounded-lg flex items-center justify-center">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <div className="flex-1">
              <Badge variant="secondary" className="bg-white/20 text-white border-0 mb-2">
                {certificate.type.replace('_', ' ').toUpperCase()}
              </Badge>
              <h2 className="font-heading text-2xl font-bold">{certificate.title}</h2>
            </div>
          </div>
        </div>

        {/* Certificate details */}
        <div className="p-8 space-y-6">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground mb-2">Description</h3>
            <p className="text-base">{certificate.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Issued By
              </h3>
              <p className="text-base font-medium">{certificate.issuerName}</p>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Issued
              </h3>
              <p className="text-base font-medium">
                {certificate.issuedAt
                  ? format(new Date(certificate.issuedAt), "MMMM d, yyyy")
                  : "Not specified"}
              </p>
            </div>
          </div>

          {certificate.expiresAt && (
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {isExpired ? "Expired On" : "Expires On"}
              </h3>
              <p className={`text-base font-medium ${isExpired ? "text-destructive" : ""}`}>
                {format(new Date(certificate.expiresAt), "MMMM d, yyyy")}
              </p>
            </div>
          )}

          {/* Verification section */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold">Blockchain-Verified Certificate</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              This certificate is secured with a unique verification hash that can be publicly verified.
            </p>
            <div className="bg-background p-3 rounded border font-mono text-xs break-all">
              {certificate.verificationHash}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              onClick={handleDownload}
              variant="default"
              className="flex-1"
              data-testid="button-download-certificate"
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1"
              data-testid="button-share-certificate"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button
              onClick={() => window.open(`/verify/${certificate.verificationHash}`, '_blank')}
              variant="outline"
              data-testid="button-verify-certificate"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Verify
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

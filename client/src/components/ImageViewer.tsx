import { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageViewerProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export function ImageViewer({
  src,
  alt,
  isOpen,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
}: ImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="image-viewer-overlay"
    >
      <div
        className="relative max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:bg-white/20"
          data-testid="button-close-image-viewer"
        >
          <X className="h-6 w-6" />
        </Button>

        {/* Image Container */}
        <div className="relative flex-1 flex items-center justify-center bg-black rounded-lg overflow-hidden">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
          <img
            src={src}
            alt={alt}
            className={`max-w-full max-h-[80vh] object-contain transition-opacity duration-200 ${
              isLoading ? "opacity-0" : "opacity-100"
            }`}
            onLoad={() => setIsLoading(false)}
            data-testid="image-viewer-image"
          />
        </div>

        {/* Navigation Buttons */}
        {(hasPrev || hasNext) && (
          <div className="flex justify-between mt-4 px-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={onPrev}
              disabled={!hasPrev}
              className="h-10 w-10"
              data-testid="button-prev-image"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={onNext}
              disabled={!hasNext}
              className="h-10 w-10"
              data-testid="button-next-image"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { PersonalTutor } from "@/components/PersonalTutor";
import { BrainCircuit } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobilePageHeader } from "@/components/MobilePageHeader";

export default function PersonalTutorPage() {
  const isMobile = useIsMobile();

  return (
    <div
      className={`flex flex-col bg-background ${
        isMobile
          ? "h-[calc(100dvh-3.5rem)] px-4 py-4"
          : "container mx-auto px-4 py-6 max-w-6xl h-[calc(100vh-64px)]"
      } overflow-hidden`}
    >
      {!isMobile && (
        <div className="mb-4 flex items-center gap-3 shrink-0">
          <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <BrainCircuit className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Personal AI Tutor</h1>
            <p className="text-sm text-muted-foreground">Your dedicated 24/7 learning companion</p>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 rounded-xl border overflow-hidden">
        <PersonalTutor />
      </div>
    </div>
  );
}

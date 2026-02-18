import { PersonalTutor } from "@/components/PersonalTutor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export default function PersonalTutorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="mb-6 flex items-center gap-3 shrink-0">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
          <BrainCircuit className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold">Personal AI Tutor</h1>
          <p className="text-muted-foreground">Your dedicated 24/7 learning companion</p>
        </div>
      </div>
      
      <div className="flex-1 min-h-0">
        <PersonalTutor />
      </div>
    </div>
  );
}

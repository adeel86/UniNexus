import { PersonalTutor } from "@/components/PersonalTutor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";

export default function PersonalTutorPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
          <BrainCircuit className="h-8 w-8 text-purple-600" />
        </div>
        <div>
          <h1 className="text-3xl font-heading font-bold">Personal AI Tutor</h1>
          <p className="text-muted-foreground">Your dedicated 24/7 learning companion</p>
        </div>
      </div>
      
      <PersonalTutor />
    </div>
  );
}

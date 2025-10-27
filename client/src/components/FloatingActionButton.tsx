import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function FloatingActionButton() {
  const handleClick = () => {
    console.log("FAB clicked - opening post composer");
  };

  return (
    <Button
      size="icon"
      className="fixed bottom-20 right-6 md:bottom-8 md:right-8 h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-primary to-chart-2 hover:scale-110 transition-transform z-40"
      onClick={handleClick}
      data-testid="button-fab-create-post"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
}

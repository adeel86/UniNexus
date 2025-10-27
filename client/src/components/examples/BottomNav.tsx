import { BottomNav } from "../BottomNav";
import { ThemeProvider } from "../ThemeProvider";

export default function BottomNavExample() {
  return (
    <ThemeProvider>
      <div className="h-screen bg-background relative pb-16">
        <p className="p-4 text-muted-foreground">View on mobile size to see bottom navigation</p>
        <BottomNav />
      </div>
    </ThemeProvider>
  );
}

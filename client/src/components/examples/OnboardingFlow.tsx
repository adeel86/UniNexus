import { OnboardingFlow } from "../OnboardingFlow";
import { ThemeProvider } from "../ThemeProvider";

export default function OnboardingFlowExample() {
  return (
    <ThemeProvider>
      <div className="p-4">
        <OnboardingFlow />
      </div>
    </ThemeProvider>
  );
}

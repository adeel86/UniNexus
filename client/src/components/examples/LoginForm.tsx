import { LoginForm } from "../LoginForm";
import { ThemeProvider } from "../ThemeProvider";

export default function LoginFormExample() {
  return (
    <ThemeProvider>
      <div className="p-4 max-w-md mx-auto">
        <LoginForm />
      </div>
    </ThemeProvider>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useLocation } from 'wouter';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Autocomplete, type AutocompleteOption } from '@/components/Autocomplete';
import { validateInstitutionalEmail, type ValidationStatus } from '@shared/emailValidation';
import {
  Users, GraduationCap, Building2, Briefcase, Shield,
  CheckCircle2, AlertTriangle, XCircle, RefreshCw, CheckCircle, Mail,
} from 'lucide-react';

type ModalView = 'login' | 'register' | 'verify-otp';

const DEV_AUTH_ENABLED = import.meta.env.VITE_DEV_AUTH_ENABLED === 'true';

const DEMO_ACCOUNTS = [
  { email: 'demo.student@uninexus.app', role: 'Student', color: 'bg-blue-100 text-blue-800' },
  { email: 'demo.teacher@uninexus.app', role: 'Teacher', color: 'bg-green-100 text-green-800' },
  { email: 'demo.university@uninexus.app', role: 'University Admin', color: 'bg-purple-100 text-purple-800' },
  { email: 'demo.industry@uninexus.app', role: 'Industry Professional', color: 'bg-orange-100 text-orange-800' },
  { email: 'demo.admin@uninexus.app', role: 'Master Admin', color: 'bg-red-100 text-red-800' },
];

const roleOptions = [
  { value: 'student', label: 'Student', icon: GraduationCap, description: 'Access learning content and social features' },
  { value: 'teacher', label: 'Teacher', icon: Users, description: 'Mentor students and view analytics' },
  { value: 'industry_professional', label: 'Industry Professional', icon: Briefcase, description: 'Connect with talent and share insights' },
  { value: 'university_admin', label: 'University Admin', icon: Building2, description: 'Manage institutional oversight' },
  ...(DEV_AUTH_ENABLED ? [{ value: 'master_admin', label: 'Master Admin', icon: Shield, description: 'Platform-wide administration' }] : []),
];

// ─── Schemas ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['student', 'teacher', 'industry_professional', 'university_admin', 'master_admin']),
  institute: z.any().optional(),
  major: z.any().optional(),
  company: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Login View ──────────────────────────────────────────────────────────────

function LoginView({
  onSwitchToRegister,
  onClose,
}: {
  onSwitchToRegister: () => void;
  onClose: () => void;
}) {
  const { signIn, resetPassword } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      onClose();
      navigate('/');
    } catch (error: any) {
      setIsLoading(false);
      if (error.code === 'auth/email-not-verified') {
        toast({
          title: 'Email not verified',
          description: 'Please check your inbox and verify your email before signing in.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login failed',
          description: error.message || 'Please check your credentials and try again.',
          variant: 'destructive',
        });
      }
    }
  };

  const loginAsDemo = async (email: string) => {
    setIsLoading(true);
    form.setValue('email', email);
    form.setValue('password', 'demo123');
    try {
      await signIn(email, 'demo123');
      onClose();
      navigate('/');
    } catch (error: any) {
      setIsLoading(false);
      toast({
        title: 'Demo login failed',
        description: error.message || 'Could not log in with demo account.',
        variant: 'destructive',
      });
    }
  };

  const onForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({ title: 'Email required', description: 'Enter your email above to reset your password.', variant: 'destructive' });
      return;
    }
    setIsResetting(true);
    try {
      await resetPassword(email);
      toast({ title: 'Reset link sent', description: 'Check your email for the password reset link.' });
    } catch (error: any) {
      toast({ title: 'Reset failed', description: error.message || 'Could not send reset email.', variant: 'destructive' });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/assets/logo.png" alt="UniNexus Logo" className="h-14 w-14 object-contain" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">Sign in to your UniNexus account</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="your.email@university.edu" type="email" autoComplete="username" data-testid="input-email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input placeholder="••••••••" type="password" autoComplete="current-password" data-testid="input-password" {...field} />
                </FormControl>
                <FormMessage />
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-0 font-normal h-auto text-primary hover:bg-transparent hover:underline"
                    onClick={onForgotPassword}
                    disabled={isResetting}
                    data-testid="button-forgot-password"
                  >
                    {isResetting ? 'Sending...' : 'Forgot password?'}
                  </Button>
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-primary hover:underline font-medium"
          data-testid="link-register"
        >
          Sign up
        </button>
      </p>

      {DEV_AUTH_ENABLED && (
        <div className="p-3 bg-muted/50 rounded-lg border border-border/50">
          <p className="text-xs font-semibold text-muted-foreground mb-2 text-center">Demo Accounts (password: demo123)</p>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => loginAsDemo(account.email)}
                disabled={isLoading}
                data-testid={`button-demo-${account.role.toLowerCase().replace(/\s+/g, '-')}`}
                className={`text-xs px-2 py-1 rounded-md font-medium cursor-pointer hover:opacity-80 transition-opacity disabled:opacity-50 ${account.color}`}
              >
                {account.role}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Register View ───────────────────────────────────────────────────────────

interface DomainStatus {
  status: ValidationStatus | null;
  message: string;
  detectedUniversity?: string;
}

function RegisterView({
  onSwitchToLogin,
  onVerifyNeeded,
}: {
  onSwitchToLogin: () => void;
  onVerifyNeeded: (email: string) => void;
}) {
  const { signUp } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [domainStatus, setDomainStatus] = useState<DomainStatus>({ status: null, message: '' });

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      role: 'student',
      institute: '',
      major: '',
      company: '',
    },
  });

  const selectedRole = form.watch('role');
  const watchedEmail = form.watch('email');

  useEffect(() => {
    if (!watchedEmail || !watchedEmail.includes('@')) {
      setDomainStatus({ status: null, message: '' });
      return;
    }
    const result = validateInstitutionalEmail(watchedEmail, selectedRole);
    setDomainStatus({ status: result.status, message: result.message, detectedUniversity: result.detectedUniversity });
    if (result.detectedUniversity && result.status === 'approved' && ['student', 'teacher', 'university_admin'].includes(selectedRole)) {
      form.setValue('institute', { id: result.detectedUniversity, name: result.detectedUniversity } as AutocompleteOption, { shouldValidate: false });
    }
  }, [watchedEmail, selectedRole]);

  const onSubmit = async (data: RegisterFormData) => {
    if (domainStatus.status === 'blocked') {
      toast({ title: 'Institutional email required', description: domainStatus.message, variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const additionalData: any = {};
      if (data.role === 'student') { additionalData.university = data.institute || null; additionalData.major = data.major || null; }
      else if (data.role === 'industry_professional') { additionalData.company = data.company || ''; }
      else if (data.role === 'teacher') { additionalData.university = data.institute || null; additionalData.major = data.major || null; }
      else if (data.role === 'university_admin') { additionalData.university = data.institute || null; }

      const result = await signUp(data.email, data.password, data.displayName, data.role, additionalData);
      onVerifyNeeded(result.email);
    } catch (error: any) {
      toast({ title: 'Registration failed', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <img src="/assets/logo.png" alt="UniNexus Logo" className="h-14 w-14 object-contain" />
        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
          Join UniNexus
        </h2>
        <p className="text-sm text-muted-foreground">Create your account to get started</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="displayName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" data-testid="input-displayname" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="your.email@university.edu" type="email" data-testid="input-email" {...field} />
                  </FormControl>
                  <FormMessage />
                  {domainStatus.status === 'blocked' && (
                    <div className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{domainStatus.message}</span>
                    </div>
                  )}
                  {domainStatus.status === 'unknown' && (
                    <div className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{domainStatus.message}</span>
                    </div>
                  )}
                  {domainStatus.status === 'approved' && (
                    <div className="flex items-start gap-2 rounded-md bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-300">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{domainStatus.message}</span>
                    </div>
                  )}
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" autoComplete="new-password" data-testid="input-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input placeholder="••••••••" type="password" autoComplete="new-password" data-testid="input-confirm-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>I am a...</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-role">
                      <SelectValue placeholder="Select your role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {roleOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            <span className="font-medium">{option.label}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {(selectedRole === 'student' || selectedRole === 'teacher' || selectedRole === 'university_admin') && (
            <FormField
              control={form.control}
              name="institute"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institute</FormLabel>
                  <FormControl>
                    <Autocomplete
                      placeholder="Search your institute..."
                      value={field.value as AutocompleteOption | null}
                      onChange={(option) => field.onChange(option)}
                      onCustomEntry={(text) => field.onChange({ id: text, name: text })}
                      searchEndpoint="/api/universities/search"
                      allowCustomEntry={true}
                      testId="autocomplete-institute"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(selectedRole === 'student' || selectedRole === 'teacher') && (
            <FormField
              control={form.control}
              name="major"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Major / Field of Study</FormLabel>
                  <FormControl>
                    <Autocomplete
                      placeholder="Search your major..."
                      value={field.value as AutocompleteOption | null}
                      onChange={(option) => field.onChange(option)}
                      onCustomEntry={(text) => field.onChange({ id: text, name: text })}
                      searchEndpoint="/api/majors/search"
                      allowCustomEntry={true}
                      testId="autocomplete-major"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {selectedRole === 'industry_professional' && (
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" data-testid="input-company" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || domainStatus.status === 'blocked'}
            data-testid="button-register"
          >
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </Form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-primary hover:underline font-medium"
          data-testid="link-login"
        >
          Sign in
        </button>
      </p>
    </div>
  );
}

// ─── Verify OTP View ─────────────────────────────────────────────────────────

const RESEND_COOLDOWN = 60;

function VerifyOtpView({
  email,
  onVerified,
  onSwitchToLogin,
}: {
  email: string;
  onVerified: () => void;
  onSwitchToLogin: () => void;
}) {
  const { verifyOtp, resendOtp } = useAuth();
  const { toast } = useToast();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleInput = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
    if (newOtp.every((d) => d !== '') && digit) handleVerify(newOtp.join(''));
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = Array.from({ length: 6 }, (_, i) => pasted[i] || '');
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((d) => !d);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
    if (pasted.length === 6) handleVerify(pasted);
  };

  const handleVerify = async (code?: string) => {
    const codeToVerify = code ?? otp.join('');
    if (codeToVerify.length < 6) {
      toast({ title: 'Incomplete code', description: 'Please enter all 6 digits.', variant: 'destructive' });
      return;
    }
    setIsVerifying(true);
    try {
      await verifyOtp(email, codeToVerify);
      setSuccess(true);
    } catch (error: any) {
      const reason = (error as any).reason;
      let description = error.message || 'Verification failed. Please try again.';
      if (reason === 'expired') description = 'Your code has expired. Please request a new one.';
      else if (reason === 'wrong_code') description = 'Incorrect code. Please check and try again.';
      else if (reason === 'max_attempts') description = 'Too many incorrect attempts. Please request a new code.';
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      toast({ title: 'Verification failed', description, variant: 'destructive' });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await resendOtp(email);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setCooldown(RESEND_COOLDOWN);
      toast({ title: 'New code sent', description: 'A fresh 6-digit code has been sent to your email.' });
    } catch (error: any) {
      if ((error as any).code === 'already_verified') {
        toast({ title: 'Already verified', description: 'Your email is already verified. You can log in.' });
        onSwitchToLogin();
        return;
      }
      toast({ title: 'Could not resend', description: error.message || 'Failed to resend code. Please try again.', variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-5 text-center py-4">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle className="w-9 h-9 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Email verified!</h2>
          <p className="text-muted-foreground text-sm">
            Your email has been confirmed. You can now sign in to your account.
          </p>
        </div>
        <Button className="w-full" onClick={onVerified} data-testid="button-go-to-login">
          Sign In Now
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Shield className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Verify your email</h2>
        <p className="text-sm text-muted-foreground">
          We sent a 6-digit code to{' '}
          <span className="font-medium text-foreground">{email}</span>.
          <br />Enter it below to activate your account.
        </p>
      </div>

      <div className="flex justify-center gap-2" onPaste={handlePaste} data-testid="otp-input-group">
        {otp.map((digit, index) => (
          <Input
            key={index}
            ref={(el) => { inputRefs.current[index] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInput(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className="w-12 h-12 text-center text-xl font-bold p-0"
            data-testid={`input-otp-${index}`}
            disabled={isVerifying}
            autoFocus={index === 0}
          />
        ))}
      </div>

      <Button
        className="w-full"
        onClick={() => handleVerify()}
        disabled={isVerifying || otp.some((d) => !d)}
        data-testid="button-verify-otp"
      >
        {isVerifying ? 'Verifying...' : 'Verify email'}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <p>Didn't receive a code?</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={isResending || cooldown > 0}
          data-testid="button-resend-otp"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
          {cooldown > 0 ? `Resend in ${cooldown}s` : isResending ? 'Sending...' : 'Resend code'}
        </Button>
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t pt-4">
        <Mail className="w-3.5 h-3.5" />
        <span>UniNexus — institutional email verification</span>
      </div>
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────

interface AuthModalProps {
  open: boolean;
  defaultView: 'login' | 'register';
  onClose: () => void;
}

export function AuthModal({ open, defaultView, onClose }: AuthModalProps) {
  const [view, setView] = useState<ModalView>(defaultView);
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    if (open) setView(defaultView);
  }, [open, defaultView]);

  const handleVerifyNeeded = (email: string) => {
    setPendingEmail(email);
    setView('verify-otp');
  };

  const handleVerified = () => {
    setView('login');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className={`
          overflow-y-auto max-h-[90vh]
          ${view === 'register' ? 'sm:max-w-lg' : 'sm:max-w-md'}
          transition-all duration-200
        `}
      >
        <div className="p-2">
          {view === 'login' && (
            <LoginView
              onSwitchToRegister={() => setView('register')}
              onClose={onClose}
            />
          )}
          {view === 'register' && (
            <RegisterView
              onSwitchToLogin={() => setView('login')}
              onVerifyNeeded={handleVerifyNeeded}
            />
          )}
          {view === 'verify-otp' && (
            <VerifyOtpView
              email={pendingEmail}
              onVerified={handleVerified}
              onSwitchToLogin={() => setView('login')}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

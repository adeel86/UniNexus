import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, GraduationCap, Building2, Briefcase, Shield, MailCheck, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Autocomplete, type AutocompleteOption } from '@/components/Autocomplete';
import { validateInstitutionalEmail, type ValidationStatus } from '@shared/emailValidation';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['student', 'teacher', 'industry_professional', 'university_admin', 'master_admin']),
  institute: z.any().optional(), // Will accept AutocompleteOption or string
  major: z.any().optional(), // Will accept AutocompleteOption or string
  company: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const roleOptions = [
  { value: 'student', label: 'Student', icon: GraduationCap, description: 'Access learning content and social features' },
  { value: 'teacher', label: 'Teacher', icon: Users, description: 'Mentor students and view analytics' },
  { value: 'industry_professional', label: 'Industry Professional', icon: Briefcase, description: 'Connect with talent and share insights' },
  { value: 'university_admin', label: 'University Admin', icon: Building2, description: 'Manage institutional oversight' },
  ...(import.meta.env.VITE_DEV_AUTH_ENABLED === 'true' ? [
    { value: 'master_admin', label: 'Master Admin', icon: Shield, description: 'Platform-wide administration' }
  ] : []),
];

interface DomainStatus {
  status: ValidationStatus | null;
  message: string;
  detectedUniversity?: string;
}

export default function Register() {
  const { signUp, currentUser, userData } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [domainStatus, setDomainStatus] = useState<DomainStatus>({ status: null, message: '' });

  // If user is authenticated, show loading while Router updates
  // This prevents showing 404 during the brief moment before Router re-renders
  if (currentUser && userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
        <div className="text-center">
          <div className="h-16 w-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

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

  // Real-time domain validation whenever email or role changes
  useEffect(() => {
    if (!watchedEmail || !watchedEmail.includes('@')) {
      setDomainStatus({ status: null, message: '' });
      return;
    }
    const result = validateInstitutionalEmail(watchedEmail, selectedRole);
    setDomainStatus({
      status: result.status,
      message: result.message,
      detectedUniversity: result.detectedUniversity,
    });
    // Auto-fill institute field for students/teachers/admins when domain is recognised.
    // Always update so the field stays in sync with the email domain — the user can
    // still clear or override it afterwards.
    if (
      result.detectedUniversity &&
      result.status === 'approved' &&
      ['student', 'teacher', 'university_admin'].includes(selectedRole)
    ) {
      form.setValue(
        'institute',
        { id: result.detectedUniversity, name: result.detectedUniversity } as AutocompleteOption,
        { shouldValidate: false }
      );
    }
  }, [watchedEmail, selectedRole]);

  const onSubmit = async (data: RegisterFormData) => {
    // Double-check domain validation before submitting
    if (domainStatus.status === 'blocked') {
      toast({
        title: 'Institutional email required',
        description: domainStatus.message,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const additionalData: any = {};
      
      if (data.role === 'student') {
        additionalData.university = data.institute || null;
        additionalData.major = data.major || null;
      } else if (data.role === 'industry_professional') {
        additionalData.company = data.company || '';
      } else if (data.role === 'teacher') {
        additionalData.university = data.institute || null;
        additionalData.major = data.major || null;
      } else if (data.role === 'university_admin') {
        additionalData.university = data.institute || null;
      }

      await signUp(data.email, data.password, data.displayName, data.role, additionalData);
      
      setRegisteredEmail(data.email);
      setVerificationSent(true);
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
        <Card className="w-full max-w-md" data-testid="card-verification-sent">
          <CardHeader className="gap-2 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30">
                <MailCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">Check your inbox</CardTitle>
            </div>
            <CardDescription className="text-base">
              We've sent a verification email to <span className="font-semibold text-foreground">{registeredEmail}</span>.
              Please click the link in the email to verify your account before logging in.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              Didn't receive the email? Check your spam folder, or{' '}
              <button
                onClick={() => { setVerificationSent(false); }}
                className="text-primary hover:underline"
              >
                go back
              </button>{' '}
              to try again.
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/login')}
              data-testid="button-go-to-login"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
      <Card className="w-full max-w-2xl">
        <CardHeader className="gap-2 text-center">
          <div className="flex flex-col items-center gap-4">
            <img src="/assets/logo.png" alt="UniNexus Logo" className="h-16 w-16 object-contain" />
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Join UniNexus</CardTitle>
          </div>
          <CardDescription>Create your account to get started</CardDescription>
        </CardHeader>
        <CardContent className="gap-6 flex flex-col">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="gap-4 flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="John Doe" 
                          data-testid="input-displayname"
                          {...field} 
                        />
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
                        <Input 
                          placeholder="your.email@university.edu" 
                          type="email"
                          data-testid="input-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                      {domainStatus.status === 'blocked' && (
                        <div
                          data-testid="email-domain-blocked"
                          className="flex items-start gap-2 rounded-md bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300"
                        >
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{domainStatus.message}</span>
                        </div>
                      )}
                      {domainStatus.status === 'unknown' && (
                        <div
                          data-testid="email-domain-unknown"
                          className="flex items-start gap-2 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
                        >
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{domainStatus.message}</span>
                        </div>
                      )}
                      {domainStatus.status === 'approved' && (
                        <div
                          data-testid="email-domain-approved"
                          className="flex items-start gap-2 rounded-md bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-3 py-2 text-xs text-green-700 dark:text-green-300"
                        >
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span>{domainStatus.message}</span>
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="••••••••" 
                          type="password"
                          autoComplete="new-password"
                          data-testid="input-password"
                          {...field} 
                        />
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
                        <Input 
                          placeholder="••••••••" 
                          type="password"
                          autoComplete="new-password"
                          data-testid="input-confirm-password"
                          {...field} 
                        />
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
                                <div>
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-muted-foreground">{option.description}</div>
                                </div>
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
                          onCustomEntry={(text) => {
                            field.onChange({ id: text, name: text });
                          }}
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
                          onCustomEntry={(text) => {
                            field.onChange({ id: text, name: text });
                          }}
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
                        <Input 
                          placeholder="Company name" 
                          data-testid="input-company"
                          {...field} 
                        />
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

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

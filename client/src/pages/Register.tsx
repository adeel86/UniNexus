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
import { Users, GraduationCap, Building2, Briefcase, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['student', 'teacher', 'industry_professional', 'university_admin', 'master_admin']),
  university: z.string().optional(),
  major: z.string().optional(),
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

export default function Register() {
  const { signUp, currentUser, userData } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser && userData) {
      navigate("/");
    }
  }, [currentUser, userData, navigate]);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      role: 'student',
      university: '',
      major: '',
      company: '',
    },
  });

  const selectedRole = form.watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      const additionalData: any = {};
      
      if (data.role === 'student') {
        additionalData.university = data.university || '';
        additionalData.major = data.major || '';
      } else if (data.role === 'industry_professional') {
        additionalData.company = data.company || '';
      } else if (data.role === 'teacher' || data.role === 'university_admin') {
        additionalData.university = data.university || '';
      }

      await signUp(data.email, data.password, data.displayName, data.role, additionalData);
      
      toast({
        title: 'Account created!',
        description: 'Welcome to UniNexus. Your profile has been created successfully.',
      });
      navigate('/');
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
                  name="university"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>University</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="University name" 
                          data-testid="input-university"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {selectedRole === 'student' && (
                <FormField
                  control={form.control}
                  name="major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Major / Field of Study</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Computer Science" 
                          data-testid="input-major"
                          {...field} 
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
                disabled={isLoading}
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

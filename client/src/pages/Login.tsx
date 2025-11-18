import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const { signIn } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await signIn(data.email, data.password);
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/');
    } catch (error: any) {
      toast({
        title: 'Login failed',
        description: error.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
      <Card className="w-full max-w-md">
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-purple-500 to-pink-500" />
            <CardTitle className="text-2xl">UniNexus</CardTitle>
          </div>
          <CardDescription>Sign in to your account to continue</CardDescription>
        </CardHeader>
        <CardContent className="gap-4 flex flex-col">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="gap-4 flex flex-col">
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
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>

          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
              Sign up
            </Link>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm font-medium mb-2">Quick Demo Access:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { email: "demo.student@uninexus.app", label: "Student" },
                { email: "demo.teacher@uninexus.app", label: "Teacher" },
                { email: "demo.university@uninexus.app", label: "Univ Admin" },
                { email: "demo.industry@uninexus.app", label: "Industry" },
                { email: "demo.admin@uninexus.app", label: "Admin" },
              ].map((demo) => (
                <Button
                  key={demo.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    form.setValue('email', demo.email);
                    form.setValue('password', 'demo123');
                  }}
                  data-testid={`button-demo-${demo.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  {demo.label}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All demo accounts use password: <code className="bg-muted px-1 py-0.5 rounded">demo123</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

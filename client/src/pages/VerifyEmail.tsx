import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Mail, RefreshCw, CheckCircle, Shield } from 'lucide-react';

const RESEND_COOLDOWN = 60;

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const { verifyOtp, resendOtp } = useAuth();
  const { toast } = useToast();

  const params = new URLSearchParams(window.location.search);
  const emailParam = params.get('email') || '';

  const [email] = useState(emailParam);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!email) {
      navigate('/login');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
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

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every(d => d !== '') && digit) {
      handleVerify(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      newOtp[i] = pasted[i] || '';
    }
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex(d => !d);
    const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
    inputRefs.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      handleVerify(pasted);
    }
  };

  const handleVerify = async (code?: string) => {
    const codeToVerify = code ?? otp.join('');
    if (codeToVerify.length < 6) {
      toast({
        title: 'Incomplete code',
        description: 'Please enter all 6 digits of your verification code.',
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);
    try {
      await verifyOtp(email, codeToVerify);
      setSuccess(true);
    } catch (error: any) {
      const reason = (error as any).reason;
      let description = error.message || 'Verification failed. Please try again.';

      if (reason === 'expired') {
        description = 'Your code has expired. Please request a new one.';
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else if (reason === 'wrong_code') {
        description = 'Incorrect code. Please check and try again.';
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else if (reason === 'max_attempts') {
        description = 'Too many incorrect attempts. Please request a new code.';
        setOtp(['', '', '', '', '', '']);
      }

      toast({
        title: 'Verification failed',
        description,
        variant: 'destructive',
      });
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
      toast({
        title: 'New code sent',
        description: 'A fresh 6-digit code has been sent to your email.',
      });
    } catch (error: any) {
      if ((error as any).code === 'already_verified') {
        toast({
          title: 'Already verified',
          description: 'Your email is already verified. You can log in.',
        });
        navigate('/login');
        return;
      }
      toast({
        title: 'Could not resend',
        description: error.message || 'Failed to resend code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
            <h1 className="text-2xl font-bold">Email verified!</h1>
            <p className="text-muted-foreground">
              Your email has been confirmed. You can now sign in to your account.
            </p>
            <Button
              className="w-full mt-2"
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
      <Card className="w-full max-w-md">
        <CardHeader className="text-center gap-2">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-7 h-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
          <CardDescription>
            We sent a 6-digit code to{' '}
            <span className="font-medium text-foreground">{email}</span>.
            <br />Enter it below to activate your account.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          <div className="flex justify-center gap-2" onPaste={handlePaste} data-testid="otp-input-group">
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleInput(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
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
            disabled={isVerifying || otp.some(d => !d)}
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
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : isResending
                ? 'Sending...'
                : 'Resend code'}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t pt-4">
            <Mail className="w-3.5 h-3.5" />
            <span>UniNexus — institutional email verification</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

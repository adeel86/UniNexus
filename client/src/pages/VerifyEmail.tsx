import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { applyActionCode, checkActionCode } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Status = 'loading' | 'success' | 'invalid' | 'expired' | 'already_verified';

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');

    if (mode !== 'verifyEmail' || !oobCode) {
      setStatus('invalid');
      return;
    }

    if (!auth) {
      setStatus('invalid');
      setErrorMessage('Authentication is not configured.');
      return;
    }

    (async () => {
      try {
        await checkActionCode(auth, oobCode);
        await applyActionCode(auth, oobCode);
        setStatus('success');
      } catch (err: any) {
        const code = err?.code || '';
        if (code === 'auth/invalid-action-code') {
          setStatus('expired');
        } else if (code === 'auth/email-already-in-use' || code === 'auth/user-not-found') {
          setStatus('already_verified');
        } else {
          setStatus('expired');
          setErrorMessage(err?.message || 'Verification failed.');
        }
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="w-14 h-14 mx-auto text-primary animate-spin" />
            <h1 className="text-2xl font-bold">Verifying your email…</h1>
            <p className="text-muted-foreground">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
            <h1 className="text-2xl font-bold">Email verified!</h1>
            <p className="text-muted-foreground">
              Your email address has been confirmed. You can now sign in to your account.
            </p>
            <Button
              data-testid="button-go-to-login"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </>
        )}

        {(status === 'expired' || status === 'invalid') && (
          <>
            <XCircle className="w-14 h-14 mx-auto text-destructive" />
            <h1 className="text-2xl font-bold">
              {status === 'expired' ? 'Link expired or already used' : 'Invalid verification link'}
            </h1>
            <p className="text-muted-foreground">
              {status === 'expired'
                ? 'This verification link has expired or was already used. Please request a new one from the login page.'
                : errorMessage || 'This link is not valid. Please try signing up again or request a new verification email.'}
            </p>
            <Button
              data-testid="button-back-to-login"
              variant="outline"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </Button>
          </>
        )}

        {status === 'already_verified' && (
          <>
            <CheckCircle className="w-14 h-14 mx-auto text-green-500" />
            <h1 className="text-2xl font-bold">Already verified</h1>
            <p className="text-muted-foreground">
              Your email is already verified. You can sign in now.
            </p>
            <Button
              data-testid="button-go-to-login-verified"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Go to Login
            </Button>
          </>
        )}

        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
          <Mail className="w-4 h-4" />
          <span>UniNexus — institutional email verification</span>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import Button from './Button';
import { supabase } from '../lib/supabaseClient';

interface LoginProps {
  onLoginSuccess: () => void;
  onLoading: () => void;
  onError: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onLoading, onError }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'LOGIN' | 'FORGOT_PASSWORD'>('LOGIN');
  const [isLoading, setIsLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    onLoading();
    setIsLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (user) {
        const { data: existingUser, error: fetchError } = await supabase
          .from('app_users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        if (!existingUser) {
          const { error: insertError } = await supabase
            .from('app_users')
            .insert({
              id: user.id,
              full_name: 'Javed Ahmed',
              phone: '7576015401',
              email: 'ahmed.javed6@gmail.com',
              role: 'ADMIN'
            });
          
          if (insertError) throw insertError;
        }

        onLoginSuccess();
      }
    } catch (error: any) {
      alert(error.message || 'An error occurred during login');
      onError();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setResetMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.href,
      });
      if (error) throw error;
      setResetMessage('Password reset link sent to your email.');
    } catch (err: any) {
      alert(err.message || 'Failed to send reset email.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto flex flex-col items-center px-6 justify-center">
      
      {/* 
         INTRO SEQUENCE: 
         1. Brand appears alone & centered (Phase 1)
         2. After delay, Brand moves up & scales down
         3. Content (Form) fades in below
      */}
      <div className="text-center mb-10 intro-brand">
        <h1 className="text-3xl font-medium tracking-tight text-gray-900">
          Horizon Flow
        </h1>
      </div>

      <div className="w-full intro-content">
        {view === 'LOGIN' ? (
          <form className="w-full space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="sr-only">Email address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50 py-3.5 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent sm:text-sm transition-all duration-200"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="sr-only">Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border border-gray-200 bg-gray-50 py-3.5 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent sm:text-sm transition-all duration-200"
                    placeholder="Password"
                  />
                  <div className="flex justify-end pt-2">
                    <button 
                      type="button" 
                      onClick={() => { setView('FORGOT_PASSWORD'); setResetMessage(null); }}
                      className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors focus:outline-none"
                    >
                       Forgot password?
                    </button>
                  </div>
                </div>
            </div>

            <div>
              <Button type="submit" className="w-full justify-center" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Log In'}
              </Button>
            </div>
          </form>
        ) : (
          <form className="w-full space-y-6" onSubmit={handleResetPassword}>
            <div className="text-center">
              <p className="text-sm text-gray-500">Enter your email to receive a reset link.</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="sr-only">Email address</label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full rounded-lg border border-gray-200 bg-gray-50 py-3.5 px-4 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900 focus:border-transparent sm:text-sm transition-all duration-200"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {resetMessage && (
              <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg text-center border border-green-100">
                {resetMessage}
              </div>
            )}

            <div className="space-y-3">
              <Button type="submit" className="w-full justify-center" disabled={isLoading || !!resetMessage}>
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full justify-center"
                onClick={() => setView('LOGIN')}
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="mt-12 intro-footer-delay">
         <p className="text-[10px] text-gray-400 font-normal">
            Horizon Flow · 2026 · Made in India
         </p>
      </div>

    </div>
  );
};

export default Login;
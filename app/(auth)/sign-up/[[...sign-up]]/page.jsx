"use client";
import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LoaderCircle } from 'lucide-react';

export default function Page() {
  const { signUpWithEmail, signInWithGoogle, user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already signed in
  React.useEffect(() => {
    if (user) router.push('/dashboard');
  }, [user, router]);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signUpWithEmail(email, password, name);
      router.push('/dashboard');
    } catch (err) {
      setError(
        err.code === 'auth/email-already-in-use'
          ? 'An account with this email already exists.'
          : err.code === 'auth/weak-password'
          ? 'Password must be at least 6 characters.'
          : 'Sign up failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      router.push('/dashboard');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Google sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-12">
        <section className="relative flex h-32 items-end bg-gradient-to-b from-[#1a4d4d] to-[#1a4d4d] lg:col-span-5 lg:h-full xl:col-span-6">
          <div className="hidden lg:relative lg:block lg:p-12">
            <a className="block text-white" href="#">
              <span className="sr-only">Home</span>
              <img src="/logo.svg" alt="IntervAi Logo" style={{ width: "100px" }} />
            </a>
            <h2 className="mt-6 text-2xl font-bold text-white sm:text-3xl md:text-4xl">
              Welcome to IntervAi
            </h2>
            <p className="mt-4 leading-relaxed text-white/90 text-justify">
              The AI Interview Coach is a virtual platform designed to simulate real interview scenarios, offering personalized feedback and performance analysis. It uses AI to assess responses, improve communication skills, and provide expert-level tips.
            </p>
          </div>
        </section>

        <main className="flex items-center justify-center px-8 py-8 sm:px-12 lg:col-span-7 lg:px-16 lg:py-12 xl:col-span-6">
          <div className="max-w-xl lg:max-w-3xl w-full">
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-display font-normal text-[#1a4d4d]">Create Account</h1>
                <p className="mt-2 text-[#4b5563] font-light">Start your interview preparation journey</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 h-12 border-2 border-[#e5d5c8] rounded-[20px] hover:bg-[#f5ebe0] transition-colors text-[#1f2937] font-medium disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e5d5c8]" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-[#6b7280]">or sign up with email</span>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1f2937]">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full h-12 px-4 border-2 border-[#e5d5c8] text-[#000] focus:border-[#4a6b5b] focus:ring-1 focus:ring-[#4a6b5b] rounded-[20px] outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1f2937]">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-12 px-4 border-2 border-[#e5d5c8] text-[#000] focus:border-[#4a6b5b] focus:ring-1 focus:ring-[#4a6b5b] rounded-[20px] outline-none transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#1f2937]">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full h-12 px-4 border-2 border-[#e5d5c8] text-[#000] focus:border-[#4a6b5b] focus:ring-1 focus:ring-[#4a6b5b] rounded-[20px] outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-[#2d5f5f] hover:bg-[#1a4d4d] text-white font-medium rounded-[20px] shadow-soft transition-all duration-300 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <LoaderCircle className="animate-spin w-5 h-5" />
                  ) : (
                    'Create Account'
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-[#6b7280]">
                Already have an account?{' '}
                <Link href="/sign-in" className="text-[#2d5f5f] font-medium hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </section>
  );
}
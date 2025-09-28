'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFetchLogin } from '../hooks/useFetchLogin';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';

function getFriendlyErrorMessage(error: unknown) {
  if (!error) return null;
  if (typeof error === 'string') {
    if (error.includes('Invalid credentials')) {
      return 'The email or password you entered is incorrect.';
    }
    return error;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message?: string }).message === 'string' &&
    (error as { message?: string }).message!.includes('Invalid credentials')
  ) {
    return 'The email or password you entered is incorrect.';
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    (error as { error?: unknown }).error === 'Invalid credentials'
  ) {
    return 'The email or password you entered is incorrect.';
  }
  return 'An unknown error occurred. Please try again.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const { login, isLoading, error } = useFetchLogin();
  const router = useRouter();
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await login(email, password);
    if (result && !error) {
      if (result.role === 'Admin') {
        router.push('/dashboard');
      } else if (result.role === 'User') {
        router.push('/profile');
      } else {
        alert('Unknown user role!');
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen w-full  flex items-center justify-center px-4">
        <div className="text-center">
          <div className="rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mx-auto mb-4 animate-spin"></div>
          <p className="text-white text-base">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center ">
      <div className="2xl:w-250 xl:w-150 xl:px-10 2xl:px-30 2xl:h-170  rounded-2xl flex flex-col items-center px-10 py-14 bg-black/0 border border-gray-600 shadow-lg shadow-gray-600">
        <h2 className="2xl:text-[50px] lg:text-[30px] xl:text-[40px] lg:mb-10 xl:mb-10 font-bold text-cyan-200 2xl:mb-28 md:w-full w-3/4 text-left">Sign In</h2>
        <form onSubmit={handleSubmit} className="md:w-full w-3/4 flex flex-col gap-7">
          <div className="relative flex items-center border-b border-white/60">
            <MailOutlineIcon className="text-white mr-3 " />
            <input
              type="email"
              value={email}
              onChange={e => setEmail((e.target as HTMLInputElement).value)}
              className="bg-transparent w-full py-3 pl-0 pr-3 text-white placeholder:text-white/70 text-[20px] outline-none"
              placeholder="Email"
              required
            />
          </div>
          <div className="relative mb-15 flex items-center border-b border-white/60">
            <LockOutlinedIcon className="text-white mr-3" />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword((e.target as HTMLInputElement).value)}
              className="bg-transparent w-full py-3 pl-0 pr-3 text-white placeholder:text-white/70 text-[20px] outline-none"
              placeholder="Password"
              required
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              tabIndex={-1}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? (
                <VisibilityOffOutlinedIcon className="text-white" />
              ) : (
                <VisibilityOutlinedIcon className="text-white" />
              )}
            </button>
          </div>
          <div className="flex w-full justify-center">
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="bg-cyan-200 w-100 text-[#0B182F] rounded-[10px] py-3 text-[22px] font-semibold  mt-2 transition-all flex justify-center"
            >
              Sign In
            </button>
          </div>
          {error && (
            <div className="text-red-400 text-center text-sm mt-2" data-testid="error-message">
              {getFriendlyErrorMessage(error)}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
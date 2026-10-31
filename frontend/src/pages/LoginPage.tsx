import { Navigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FullPageSpinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';

const GoogleG = () => (
  <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
    <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 010-9.4l-7.9-6.1a24 24 0 000 21.6l7.9-6.1z" />
    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
  </svg>
);

export default function LoginPage() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/scheduled" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-line bg-white p-8 text-center shadow-sm">
        <h1 className="mb-6 text-xl font-semibold">Login</h1>
        <a href="/api/auth/google" className="block">
          <Button variant="solid" className="w-full !border-brand-tint !bg-brand-tint !text-ink hover:!bg-green-100" icon={<GoogleG />}>
            Login with Google
          </Button>
        </a>
        {params.get('error') && (
          <p role="alert" className="mt-4 text-sm text-red-600">
            Google sign-in didn't complete. Please try again.
          </p>
        )}
      </div>
    </main>
  );
}

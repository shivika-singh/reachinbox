import { Loader2 } from 'lucide-react';

export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <Loader2 className={`animate-spin ${className}`} aria-label="Loading" />
);

export const FullPageSpinner = () => (
  <div className="flex h-screen items-center justify-center text-brand"><Spinner className="h-8 w-8" /></div>
);

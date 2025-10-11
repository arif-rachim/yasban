'use client';

import { useRouter } from 'next/navigation';
import { Button } from './button';

interface BackButtonProps {
  fallbackHref?: string;
  label?: string;
}

export function BackButton({ fallbackHref, label = 'Back' }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else if (fallbackHref) {
      router.push(fallbackHref);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleBack}
      className="mb-4"
    >
      ← {label}
    </Button>
  );
}

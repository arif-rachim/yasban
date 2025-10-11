'use client';

import { Button } from '@/components/ui/button';

interface WizardNavigationProps {
  onPrevious?: () => void;
  onNext?: () => void;
  onCancel?: () => void;
  previousLabel?: string;
  nextLabel?: string;
  cancelLabel?: string;
  canGoNext?: boolean;
  canGoPrevious?: boolean;
  isNextLoading?: boolean;
  showPrevious?: boolean;
  showNext?: boolean;
  showCancel?: boolean;
}

export function WizardNavigation({
  onPrevious,
  onNext,
  onCancel,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  cancelLabel = 'Cancel',
  canGoNext = true,
  canGoPrevious = true,
  isNextLoading = false,
  showPrevious = true,
  showNext = true,
  showCancel = true,
}: WizardNavigationProps) {
  return (
    <div className="flex items-center justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
      <div>
        {showCancel && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {cancelLabel}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {showPrevious && onPrevious && (
          <Button
            type="button"
            variant="outline"
            onClick={onPrevious}
            disabled={!canGoPrevious}
          >
            {previousLabel}
          </Button>
        )}

        {showNext && onNext && (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canGoNext || isNextLoading}
          >
            {isNextLoading ? 'Loading...' : nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

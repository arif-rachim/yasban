'use client';

import { ReactNode } from 'react';

interface WizardStep {
  id: string;
  title: string;
  description?: string;
}

interface WizardContainerProps {
  title: string;
  description?: string;
  steps: WizardStep[];
  currentStepId: string;
  children: ReactNode;
}

export function WizardContainer({
  title,
  description,
  steps,
  currentStepId,
  children,
}: WizardContainerProps) {
  const currentStepIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {title}
          </h1>
          {description && (
            <p className="text-gray-500 dark:text-gray-400 mt-2">
              {description}
            </p>
          )}
        </div>

        {/* Step Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isActive = step.id === currentStepId;
              const isCompleted = index < currentStepIndex;
              const isUpcoming = index > currentStepIndex;

              return (
                <div key={step.id} className="flex-1 relative">
                  {/* Connector Line */}
                  {index > 0 && (
                    <div
                      className={`absolute top-4 right-1/2 left-0 h-0.5 ${
                        isCompleted || isActive
                          ? 'bg-primary-600 dark:bg-primary-400'
                          : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    />
                  )}

                  {/* Step Circle & Label */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                        isActive
                          ? 'bg-primary-600 dark:bg-primary-500 text-white ring-4 ring-primary-100 dark:ring-primary-900'
                          : isCompleted
                          ? 'bg-primary-600 dark:bg-primary-500 text-white'
                          : 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {isCompleted ? (
                        <svg
                          className="w-4 h-4"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>

                    <div className="mt-2 text-center">
                      <div
                        className={`text-sm font-medium ${
                          isActive
                            ? 'text-gray-900 dark:text-gray-100'
                            : isCompleted
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-500 dark:text-gray-500'
                        }`}
                      >
                        {step.title}
                      </div>
                      {step.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {step.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

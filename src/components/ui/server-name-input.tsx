'use client';

import * as React from 'react';
import { Input } from './input';
import { Label } from './label';
import { validateServerName, toKebabCase, toLiveKebabCase } from '@/lib/validation';

export interface ServerNameInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  showValidation?: boolean;
  onValidationChange?: (valid: boolean) => void;
}

const ServerNameInput = React.forwardRef<HTMLInputElement, ServerNameInputProps>(
  ({
    label = 'Server Name',
    helperText = 'Use kebab-case: lowercase letters, numbers, and hyphens (e.g., postgres-production)',
    error: externalError,
    showValidation = true,
    onValidationChange,
    className = '',
    ...props
  }, ref) => {
    const [value, setValue] = React.useState(props.defaultValue?.toString() || '');
    const [touched, setTouched] = React.useState(false);
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const [isValid, setIsValid] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Use LIVE conversion (allows typing hyphens naturally, converts spaces to hyphens)
      if (inputValue) {
        inputValue = toLiveKebabCase(inputValue);
      }

      setValue(inputValue);

      // Validate
      if (inputValue) {
        const validation = validateServerName(inputValue);
        setIsValid(validation.valid);
        setValidationError(validation.valid ? null : validation.error || null);

        if (onValidationChange) {
          onValidationChange(validation.valid);
        }
      } else {
        setIsValid(false);
        setValidationError(null);
        if (onValidationChange) {
          onValidationChange(false);
        }
      }

      // Update the actual input value
      e.target.value = inputValue;
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Final cleanup: remove leading/trailing hyphens
      const cleanedValue = toKebabCase(value);
      if (cleanedValue !== value) {
        setValue(cleanedValue);
        e.target.value = cleanedValue;

        // Re-validate with cleaned value
        if (cleanedValue) {
          const validation = validateServerName(cleanedValue);
          setIsValid(validation.valid);
          setValidationError(validation.valid ? null : validation.error || null);

          if (onValidationChange) {
            onValidationChange(validation.valid);
          }
        }
      }

      setTouched(true);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const showError = touched && (externalError || validationError);
    const showSuccess = touched && !showError && isValid && value.length > 0;

    return (
      <div className="grid gap-2">
        {label && (
          <Label htmlFor={props.id || props.name}>
            {label} {props.required && <span className="text-red-500">*</span>}
          </Label>
        )}

        <div className="relative">
          <Input
            ref={ref}
            type="text"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            className={`${className} ${
              showValidation && showError ? 'border-red-500 focus-visible:ring-red-500' : ''
            } ${
              showValidation && showSuccess ? 'border-green-500 focus-visible:ring-green-500' : ''
            }`}
            {...props}
          />

          {showValidation && showSuccess && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
              ✓
            </div>
          )}

          {showValidation && showError && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
              ✕
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {/* Character counter */}
          {value && (
            <p className={`text-xs ${
              value.length > 50 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {value.length}/50 characters
            </p>
          )}

          {/* Helper text or error message */}
          {showError ? (
            <p className="text-xs text-red-500">
              {externalError || validationError}
            </p>
          ) : helperText ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {helperText}
            </p>
          ) : null}

          {/* Example */}
          {!showError && !value && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Examples: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">postgres-prod</code>, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">mysql-analytics</code>
            </p>
          )}
        </div>
      </div>
    );
  }
);

ServerNameInput.displayName = 'ServerNameInput';

export { ServerNameInput };

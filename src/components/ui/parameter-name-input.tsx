'use client';

import * as React from 'react';
import { Input } from './input';
import { Label } from './label';
import { validateParameterName, toSnakeCase, toCamelCase, parameterMatchesStyle } from '@/lib/validation';

export interface ParameterNameInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  label?: string;
  helperText?: string;
  error?: string;
  showValidation?: boolean;
  onValidationChange?: (valid: boolean) => void;
  suggestedStyle?: 'camelCase' | 'snake_case';
  allowStylePicker?: boolean;
}

const ParameterNameInput = React.forwardRef<HTMLInputElement, ParameterNameInputProps>(
  ({
    label = 'Parameter Name',
    helperText,
    error: externalError,
    showValidation = true,
    onValidationChange,
    suggestedStyle = 'camelCase',
    allowStylePicker = true,
    className = '',
    ...props
  }, ref) => {
    const [value, setValue] = React.useState(props.defaultValue?.toString() || '');
    const [touched, setTouched] = React.useState(false);
    const [validationError, setValidationError] = React.useState<string | null>(null);
    const [isValid, setIsValid] = React.useState(false);
    const [selectedStyle, setSelectedStyle] = React.useState<'camelCase' | 'snake_case'>(suggestedStyle);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;

      // Auto-convert based on selected style
      if (inputValue) {
        if (selectedStyle === 'snake_case') {
          inputValue = toSnakeCase(inputValue);
        } else {
          inputValue = toCamelCase(inputValue);
        }
      }

      setValue(inputValue);

      // Validate
      if (inputValue) {
        const validation = validateParameterName(inputValue);
        const matchesStyle = parameterMatchesStyle(inputValue, selectedStyle);
        setIsValid(validation.valid && matchesStyle);

        if (!validation.valid) {
          setValidationError(validation.error || null);
        } else if (!matchesStyle) {
          setValidationError(`Parameter should be in ${selectedStyle}`);
        } else {
          setValidationError(null);
        }

        if (onValidationChange) {
          onValidationChange(validation.valid && matchesStyle);
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
      setTouched(true);
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const handleStyleChange = (style: 'camelCase' | 'snake_case') => {
      setSelectedStyle(style);
      // Re-convert current value to new style
      if (value) {
        const newValue = style === 'snake_case' ? toSnakeCase(value) : toCamelCase(value);
        setValue(newValue);
      }
    };

    const showError = touched && (externalError || validationError);
    const showSuccess = touched && !showError && isValid && value.length > 0;

    const defaultHelperText = selectedStyle === 'camelCase'
      ? 'Use camelCase: start with lowercase, capitalize each word (e.g., userId, firstName)'
      : 'Use snake_case: lowercase letters, numbers, and underscores (e.g., user_id, first_name)';

    return (
      <div className="grid gap-2">
        {label && (
          <Label htmlFor={props.id || props.name}>
            {label} {props.required && <span className="text-red-500">*</span>}
          </Label>
        )}

        {allowStylePicker && (
          <div className="flex gap-2 mb-1">
            <button
              type="button"
              onClick={() => handleStyleChange('camelCase')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                selectedStyle === 'camelCase'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              camelCase
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange('snake_case')}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                selectedStyle === 'snake_case'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              snake_case
            </button>
          </div>
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
              value.length > 64 ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
            }`}>
              {value.length}/64 characters
            </p>
          )}

          {/* Helper text or error message */}
          {showError ? (
            <p className="text-xs text-red-500">
              {externalError || validationError}
            </p>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {helperText || defaultHelperText}
            </p>
          )}

          {/* Examples based on selected style */}
          {!showError && !value && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {selectedStyle === 'camelCase' ? (
                <>
                  Examples: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">userId</code>, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">firstName</code>, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">createdAt</code>
                </>
              ) : (
                <>
                  Examples: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">user_id</code>, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">first_name</code>, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">created_at</code>
                </>
              )}
            </p>
          )}

          {/* Recommendation for tool types */}
          {allowStylePicker && !value && (
            <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded text-xs text-blue-700 dark:text-blue-300">
              💡 <strong>Tip:</strong> Use <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">camelCase</code> for REST APIs / JavaScript, or <code className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">snake_case</code> for SQL / Python
            </div>
          )}
        </div>
      </div>
    );
  }
);

ParameterNameInput.displayName = 'ParameterNameInput';

export { ParameterNameInput };

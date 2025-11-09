import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label: string
  name: string
  error?: string
  required?: boolean
  helperText?: string
  className?: string
}

export interface InputFieldProps extends FormFieldProps {
  type?: React.InputHTMLAttributes<HTMLInputElement>['type']
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled?: boolean
}

export interface TextareaFieldProps extends FormFieldProps {
  placeholder?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  disabled?: boolean
  rows?: number
}

export interface SelectFieldProps extends FormFieldProps {
  options: { value: string; label: string; disabled?: boolean }[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

/**
 * Reusable Input Field Component
 * 
 * @example
 * <InputField
 *   label="Email"
 *   name="email"
 *   type="email"
 *   placeholder="you@example.com"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   error={errors.email}
 *   required
 * />
 */
export function InputField({
  label,
  name,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required,
  disabled,
  className,
}: InputFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className={cn(error && 'text-destructive')}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        error={!!error}
        helperText={error || helperText}
        disabled={disabled}
        required={required}
      />
    </div>
  )
}

/**
 * Reusable Textarea Field Component
 */
export function TextareaField({
  label,
  name,
  placeholder,
  value,
  onChange,
  error,
  helperText,
  required,
  disabled,
  rows = 4,
  className,
}: TextareaFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className={cn(error && 'text-destructive')}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Textarea
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        error={!!error}
        helperText={error || helperText}
        disabled={disabled}
        required={required}
        rows={rows}
      />
    </div>
  )
}

/**
 * Reusable Select Field Component
 */
export function SelectField({
  label,
  name,
  options,
  value,
  onValueChange,
  placeholder = 'Select...',
  error,
  helperText,
  required,
  disabled,
  className,
}: SelectFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={name} className={cn(error && 'text-destructive')}>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger 
          id={name} 
          className={cn(
            error && 'border-destructive/50 hover:border-destructive/60 focus:border-destructive/60'
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(error || helperText) && (
        <p className={cn(
          'text-xs mt-1.5',
          error ? 'text-destructive' : 'text-muted-foreground'
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  )
}


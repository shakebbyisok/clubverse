'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ModalActionButtonProps {
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>
  isLoading?: boolean
  disabled?: boolean
  label: string
  icon?: ReactNode
  variant?: 'save' | 'default'
  type?: 'button' | 'submit'
  size?: 'sm' | 'default' | 'lg'
}

export function ModalActionButton({
  onClick,
  isLoading = false,
  disabled = false,
  label,
  icon,
  variant = 'save',
  type = 'button',
  size = 'default',
}: ModalActionButtonProps) {
  const getLoadingLabel = () => {
    if (label.includes('Create')) return 'Creating...'
    if (label.includes('Save')) return 'Saving...'
    if (label.includes('Update')) return 'Updating...'
    return 'Loading...'
  }

  return (
    <Button
      type={type}
      variant={variant}
      onClick={onClick}
      disabled={isLoading || disabled}
      size={size}
      className={cn(
        size === 'sm' && 'h-8 text-xs',
        'gap-1.5'
      )}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {getLoadingLabel()}
        </>
      ) : (
        <>
          {icon}
          {label}
        </>
      )}
    </Button>
  )
}


'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  disabled?: boolean
  allowDecimals?: boolean
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  className,
  disabled = false,
  allowDecimals = false,
}: NumberInputProps) {
  const [inputValue, setInputValue] = useState(value.toString())

  // Sync inputValue with value prop
  useEffect(() => {
    setInputValue(value.toString())
  }, [value])

  const handleIncrement = () => {
    const newValue = allowDecimals 
      ? parseFloat((value + step).toFixed(2))
      : value + step
    const finalValue = max !== undefined ? Math.min(newValue, max) : newValue
    onChange(finalValue)
    setInputValue(finalValue.toString())
  }

  const handleDecrement = () => {
    const newValue = allowDecimals
      ? parseFloat((value - step).toFixed(2))
      : value - step
    const finalValue = Math.max(newValue, min)
    onChange(finalValue)
    setInputValue(finalValue.toString())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    
    if (newValue === '' || newValue === '-') {
      return
    }
    
    const numValue = allowDecimals ? parseFloat(newValue) : parseInt(newValue, 10)
    
    if (!isNaN(numValue)) {
      let finalValue = numValue
      if (min !== undefined) finalValue = Math.max(finalValue, min)
      if (max !== undefined) finalValue = Math.min(finalValue, max)
      onChange(finalValue)
    }
  }

  const handleBlur = () => {
    const numValue = allowDecimals ? parseFloat(inputValue) : parseInt(inputValue, 10)
    if (isNaN(numValue)) {
      setInputValue(value.toString())
    } else {
      let finalValue = numValue
      if (min !== undefined) finalValue = Math.max(finalValue, min)
      if (max !== undefined) finalValue = Math.min(finalValue, max)
      onChange(finalValue)
      setInputValue(finalValue.toString())
    }
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className="h-7 w-7 p-0"
      >
        <Minus className="h-3 w-3" />
      </Button>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="h-7 w-20 text-center text-sm"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleIncrement}
        disabled={disabled || (max !== undefined && value >= max)}
        className="h-7 w-7 p-0"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  )
}


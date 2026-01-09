'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ClubverseLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  fullScreen?: boolean
}

const sizeConfig = {
  sm: { ring: 'w-10 h-10', icon: 20 },
  md: { ring: 'w-16 h-16', icon: 28 },
  lg: { ring: 'w-20 h-20', icon: 36 },
}

export function ClubverseLoader({ 
  size = 'md', 
  className,
  fullScreen = false 
}: ClubverseLoaderProps) {
  const config = sizeConfig[size]

  const loader = (
    <div className={cn("relative flex items-center justify-center", className)}>
      {/* Spinning ring */}
      <div 
        className={cn(
          "absolute rounded-full border-2 border-white/10 border-t-white/60 animate-spin",
          config.ring
        )} 
      />
      {/* Clubverse icon */}
      <Image
        src="/assets/whiteicon.svg"
        alt="Loading"
        width={config.icon}
        height={config.icon}
        className="opacity-80"
        unoptimized
        priority
      />
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0a0a0a]">
        {loader}
      </div>
    )
  }

  return loader
}



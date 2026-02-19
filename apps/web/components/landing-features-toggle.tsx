'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { LandingFeatures } from './landing-features'
import { SelfHostedPackages } from './self-hosted-packages'
import { RunLocally } from './run-locally'
import { Cloud, Server, Terminal } from 'lucide-react'

type ViewMode = 'cloud' | 'self-hosted' | 'run-locally'

export function LandingFeaturesToggle() {
  const [viewMode, setViewMode] = useState<ViewMode>('cloud')

  return (
    <div className="w-full">
      {/* Toggle Group - positioned to overlap with hero section */}
      <div className="flex justify-center mt-8 md:-mt-24 mb-8 md:mb-0 relative z-10">
        <div className="inline-flex items-center bg-background/80 backdrop-blur-sm rounded-full p-1 md:p-1.5 border border-border shadow-lg absolute -top-[30px] md:-top-[240px]">
          <button
            onClick={() => setViewMode('cloud')}
            className={cn(
              "flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200",
              viewMode === 'cloud'
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Cloud className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Cloud
          </button>
          <button
            onClick={() => setViewMode('self-hosted')}
            className={cn(
              "flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200",
              viewMode === 'self-hosted'
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Server className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Self Hosted
          </button>
          <button
            onClick={() => setViewMode('run-locally')}
            className={cn(
              "flex items-center gap-1.5 md:gap-2 px-3 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200",
              viewMode === 'run-locally'
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Terminal className="w-3.5 h-3.5 md:w-4 md:h-4" />
            Run Locally
          </button>
        </div>
      </div>

      {/* Content based on view mode */}
      <div className="transition-all duration-300 mt-12 md:mt-20">
        {viewMode === 'cloud' ? (
          <LandingFeatures />
        ) : viewMode === 'self-hosted' ? (
          <SelfHostedPackages />
        ) : (
          <RunLocally />
        )}
      </div>
    </div>
  )
}

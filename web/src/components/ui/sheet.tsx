"use client"

import React, { useState, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Sheet: React.FC<SheetProps> = ({ open, onOpenChange, children }) => {
  return <>{children}</>
}

interface SheetTriggerProps {
  asChild?: boolean
  children: React.ReactNode
}

const SheetTrigger: React.FC<SheetTriggerProps> = ({ 
  asChild = false, 
  children 
}) => {
  return <>{children}</>
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "right" | "bottom" | "left"
  children: React.ReactNode
}

const SheetContent: React.FC<SheetContentProps> = ({ 
  children, 
  className,
  side = "right",
  ...props
}) => {
  return (
    <div 
      className={cn(
        "fixed inset-y-0 right-0 z-50 h-full w-3/4 border-l bg-background p-6 shadow-lg sm:max-w-sm",
        className
      )}
      {...props}
    >
      {children}
      <button 
        className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        onClick={() => {}}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </button>
    </div>
  )
}

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const SheetHeader: React.FC<SheetHeaderProps> = ({ 
  className, 
  ...props 
}) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)

interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const SheetTitle: React.FC<SheetTitleProps> = ({ 
  className, 
  ...props 
}) => (
  <h3
    className={cn(
      "text-lg font-semibold text-foreground",
      className
    )}
    {...props}
  />
)

export {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle
} 
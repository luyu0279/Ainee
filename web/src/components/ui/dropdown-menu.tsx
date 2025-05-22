"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

interface DropdownMenuProps {
  children: React.ReactNode;
}

const DropdownMenu = ({ children }: DropdownMenuProps) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const handleTriggerClick = () => {
    setIsOpen(!isOpen);
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === DropdownMenuTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              ref: triggerRef,
              onClick: handleTriggerClick,
            });
          } else if (child.type === DropdownMenuContent && isOpen) {
            return React.cloneElement(child as React.ReactElement<any>, {
              ref: menuRef,
            });
          }
        }
        return null; // Only render Trigger and Content (if open)
      })}
    </div>
  );
};

const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }
>(({ children, className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  
  return (
    <Comp
      ref={ref}
      type={!asChild ? "button" : undefined}
      className={cn("inline-flex justify-center items-center", className)}
      {...props}
    >
      {children}
    </Comp>
  );
});
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

interface DropdownMenuContentProps extends React.HTMLAttributes<HTMLDivElement> {
  align?: "start" | "center" | "end";
}

const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ children, className, align = "end", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "absolute z-50 mt-2 w-56 rounded-md shadow-lg bg-popover text-popover-foreground ring-1 ring-black ring-opacity-5 focus:outline-none",
      align === "end" && "right-0 origin-top-right",
      align === "start" && "left-0 origin-top-left",
      align === "center" && "left-1/2 -translate-x-1/2 origin-top",
      className
    )}
    {...props}
  >
    <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
      {children}
    </div>
  </div>
));
DropdownMenuContent.displayName = "DropdownMenuContent";

const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement, // Changed from HTMLDivElement to HTMLButtonElement for better semantics
  React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean } // Added asChild for Link compatibility
>(({ className, children, asChild, ...props }, ref) => {
  const Comp = asChild ? 'span' : 'button'; // Use span if asChild is true to wrap Link
  return (
    <Comp
      ref={ref}
      role="menuitem"
      className={cn(
        "block w-full text-left px-4 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:opacity-50 disabled:pointer-events-none",
        Comp === 'button' && "cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});
DropdownMenuItem.displayName = "DropdownMenuItem";

const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { inset?: boolean }
>(({ className, inset, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "px-4 py-2 text-sm font-semibold text-popover-foreground",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

const DropdownMenuSeparator = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";

// Add other DropdownMenu parts as needed (CheckboxItem, RadioGroup, etc.)

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
};

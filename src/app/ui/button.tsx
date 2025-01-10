// components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";
import { Loader2 } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-slate-50 hover:bg-slate-900/90",
        destructive: "bg-red-500 text-slate-50 hover:bg-red-500/90",
        outline:
          "border border-slate-200 bg-white hover:bg-slate-100 hover:text-slate-900",
        secondary: "bg-slate-100 text-slate-900 hover:bg-slate-100/80",
        ghost: "hover:bg-slate-100 hover:text-slate-900",
        link: "text-slate-900 underline-offset-4 hover:underline",
        gradient:
          "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-200",
        glow: "bg-white text-purple-600 shadow-lg shadow-purple-500/50 hover:shadow-purple-500/75 hover:scale-[1.02] transition-all duration-200",
        neon: "relative bg-black text-white border border-purple-500/50 hover:border-purple-500 overflow-hidden transition-all duration-300 hover:text-purple-400 [&>span]:relative [&>span]:z-10",
        minimal: "text-slate-500 hover:text-slate-900 transition-colors",
        glass:
          "backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/20 transition-all duration-200",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        xl: "h-12 rounded-lg px-10 text-base",
        icon: "h-10 w-10",
        "2xl": "h-14 rounded-lg px-12 text-lg",
      },
      isLoading: {
        true: "cursor-wait opacity-70",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      isLoading: false,
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    Omit<VariantProps<typeof buttonVariants>, "size"> {
  asChild?: boolean;
  isLoading?: boolean;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link"
    | "gradient"
    | "glow"
    | "neon"
    | "minimal"
    | "glass";
  size?: "default" | "sm" | "lg" | "xl" | "icon" | "2xl";
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loadingText?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      isLoading,
      leftIcon,
      rightIcon,
      loadingText,
      children,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    // Render loading spinner with optional loading text
    if (isLoading) {
      return (
        <Comp
          className={cn(
            buttonVariants({ variant, size, isLoading, className })
          )}
          ref={ref}
          {...props}
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText || children}
        </Comp>
      );
    }

    // Render button with optional icons
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {leftIcon && <span className="mr-2">{leftIcon}</span>}
        {variant === "neon" ? <span>{children}</span> : children}
        {rightIcon && <span className="ml-2">{rightIcon}</span>}
        {variant === "neon" && (
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };

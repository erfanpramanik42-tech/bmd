import React from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'purple' | 'gray';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'bg-primary text-white active:bg-primary-dark',
    secondary: 'bg-accent text-white',
    danger: 'bg-danger text-white',
    outline: 'bg-transparent border-2 border-primary text-primary',
    ghost: 'bg-transparent text-primary',
    purple: 'bg-purple-600 text-white',
    gray: 'bg-app-bg-secondary text-app-text-secondary',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-3 text-sm font-semibold rounded-app-sm',
    lg: 'px-6 py-4 text-base font-bold rounded-app',
  };

  return (
    <button
      className={cn(
        'flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none font-sans',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
};

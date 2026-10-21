import React from 'react';

const Button = ({ children, onClick, disabled, className = '', icon: Icon, variant = 'primary', ...props }) => {
  const variants = {
    primary: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20',
    secondary: 'bg-secondary hover:bg-secondary/80 text-secondary-foreground',
    ghost: 'hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300',
    outline: 'border-2 border-primary/20 hover:border-primary/50 text-gray-700 dark:text-gray-200 bg-transparent'
  };
  return (
    <button 
        onClick={onClick} 
        disabled={disabled}
        className={`inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold tracking-wide transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${className}`} 
        {...props}
    >
        {Icon && <Icon size={18} className="mr-2" strokeWidth={2.5} />}
        {children}
    </button>
  );
};

export default Button;

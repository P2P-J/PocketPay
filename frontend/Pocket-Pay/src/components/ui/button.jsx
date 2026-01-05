export function Button({ children, variant, size, className, onClick, ...props }) {
  const baseStyles = "px-4 py-2 rounded-lg font-medium transition-colors";
  
  let variantStyles = "bg-primary text-white hover:bg-primary/90";
  if (variant === "ghost") {
    variantStyles = "bg-transparent hover:bg-muted text-foreground";
  }
  
  let sizeStyles = "";
  if (size === "icon") {
    sizeStyles = "p-2 h-auto";
  } else if (size === "sm") {
    sizeStyles = "px-2 py-1 text-sm";
  } else if (size === "lg") {
    sizeStyles = "px-6 py-3 text-lg";
  }
  
  return (
    <button 
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className || ""}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}

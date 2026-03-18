import { cn } from "@/lib/utils";
import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  theme?: "light" | "dark";
}

export function Input({
  label,
  error,
  hint,
  theme = "light",
  className,
  id,
  ...props
}: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  const inputStyles =
    theme === "dark"
      ? "bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500"
      : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500";

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm font-bold",
            theme === "dark" ? "text-slate-300" : "text-slate-700"
          )}
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full px-4 py-3 border rounded-xl text-sm outline-none transition-colors",
          inputStyles,
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && (
        <p
          className={cn(
            "text-xs",
            theme === "dark" ? "text-slate-500" : "text-slate-400"
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  theme?: "light" | "dark";
}

export function Textarea({
  label,
  error,
  theme = "light",
  className,
  id,
  ...props
}: TextareaProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  const inputStyles =
    theme === "dark"
      ? "bg-slate-800/60 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:border-indigo-500"
      : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-indigo-500";

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            "block text-sm font-bold",
            theme === "dark" ? "text-slate-300" : "text-slate-700"
          )}
        >
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={cn(
          "w-full px-4 py-3 border rounded-xl text-sm outline-none transition-colors resize-none",
          inputStyles,
          error && "border-red-400",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

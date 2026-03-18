import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "indigo" | "purple" | "emerald" | "amber" | "teal";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variants = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-orange-100 text-orange-600",
    danger: "bg-red-100 text-red-600",
    indigo: "bg-indigo-50 text-indigo-600 border border-indigo-100",
    purple: "bg-purple-50 text-purple-600 border border-purple-100",
    emerald: "bg-emerald-50 text-emerald-600 border border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border border-amber-100",
    teal: "bg-teal-50 text-teal-600 border border-teal-100",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  theme?: "light" | "dark";
}

export function Card({ children, className, theme = "light" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl",
        theme === "dark"
          ? "bg-slate-800/80 border border-slate-700"
          : "bg-white border border-slate-100 shadow-sm",
        className
      )}
    >
      {children}
    </div>
  );
}

interface StepsProps {
  current: number;
  total: number;
  labels?: string[];
  theme?: "light" | "dark";
}

export function Steps({ current, total, labels, theme = "light" }: StepsProps) {
  return (
    <div className="flex items-center gap-3">
      {Array.from({ length: total }).map((_, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;

        return (
          <div key={i} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                  isActive
                    ? "bg-indigo-600 text-white"
                    : isDone
                    ? "bg-emerald-500 text-white"
                    : theme === "dark"
                    ? "bg-slate-700 text-slate-400"
                    : "bg-slate-200 text-slate-400"
                )}
              >
                {isDone ? "✓" : step}
              </div>
              {labels && (
                <span
                  className={cn(
                    "text-[10px] font-medium whitespace-nowrap",
                    isActive
                      ? "text-indigo-600"
                      : theme === "dark"
                      ? "text-slate-500"
                      : "text-slate-400"
                  )}
                >
                  {labels[i]}
                </span>
              )}
            </div>
            {i < total - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 mb-4",
                  isDone ? "bg-emerald-500" : theme === "dark" ? "bg-slate-700" : "bg-slate-200"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

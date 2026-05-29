import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  description: string;
}

const STEPS: Step[] = [
  { label: "Describe Content",   description: "Choose type & key points" },
  { label: "Review AI Draft",    description: "Edit generated content"   },
  { label: "Save & Submit",      description: "Save or send for approval" },
];

interface TaskStepperProps {
  /** 0-based current step index */
  currentStep: number;
}

export function TaskStepper({ currentStep }: TaskStepperProps) {
  return (
    <nav aria-label="Content creation steps">
      <ol className="flex items-center" role="list">
        {STEPS.map((step, index) => {
          const done    = currentStep > index;
          const active  = currentStep === index;
          const pending = currentStep < index;

          return (
            <li key={step.label} className="flex flex-1 items-center last:flex-none">
              {/* Step node */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all duration-300",
                    done    && "border-indigo-600 bg-indigo-600 text-white",
                    active  && "border-indigo-600 bg-white text-indigo-600 shadow-md shadow-indigo-100 ring-4 ring-indigo-50",
                    pending && "border-slate-200 bg-white text-slate-400"
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done ? (
                    <Check className="h-4 w-4 stroke-[2.5]" aria-hidden="true" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-xs font-semibold transition-colors",
                      done || active ? "text-slate-800" : "text-slate-400"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="hidden text-[11px] text-slate-400 sm:block">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mb-7 mx-3 h-0.5 flex-1 rounded-full transition-all duration-500",
                    done ? "bg-indigo-600" : "bg-slate-200"
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

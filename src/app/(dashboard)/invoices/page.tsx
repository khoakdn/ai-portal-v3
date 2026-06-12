export const dynamic = "force-dynamic";

import { BudgetCommandCenter } from "@/components/invoices/budget-command-center";

export const metadata = { title: "Budget Command Center — AI Portal" };

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Budget Command Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          IC Annual Marketing Budget — real-time tracking, invoice categorisation, and spend analysis.
        </p>
      </div>
      <BudgetCommandCenter />
    </div>
  );
}

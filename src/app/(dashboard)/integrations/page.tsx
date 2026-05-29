import { Suspense } from "react";
import { Loader2, Webhook } from "lucide-react";
import { getIntegrationRows } from "@/actions/integrations/get-settings";
import { IntegrationSettingsForm } from "@/components/integrations/integration-settings-form";

async function SettingsFetcher() {
  const { rows, error } = await getIntegrationRows();
  return <IntegrationSettingsForm initialRows={rows} fetchError={error} />;
}

export default function IntegrationsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight">
            <Webhook className="h-6 w-6 text-primary" aria-hidden="true" />
            Integrations
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure notification webhooks. Changes made here are stored in the database and
            take effect immediately — no redeployment required.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">Loading settings…</p>
            </div>
          </div>
        }
      >
        <SettingsFetcher />
      </Suspense>
    </div>
  );
}

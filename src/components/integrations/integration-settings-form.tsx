"use client";

import { useState, useTransition } from "react";
import {
  MessageSquare,
  Tent,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Save,
  ExternalLink,
  Info,
} from "lucide-react";
import { saveIntegrationSettings } from "@/actions/integrations/save-settings";
import { testNotification } from "@/actions/integrations/test-notification";
import type { IntegrationRow } from "@/actions/integrations/get-settings";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Per-card state ────────────────────────────────────────────────────────────

interface CardState {
  enabled: boolean;
  webhookUrl: string;
  notifyOnApproved: boolean;
  notifyOnRejected: boolean;
  notifyOnPending: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  testStatus: "idle" | "testing" | "ok" | "error";
  testError: string | null;
}

function rowToCardState(row: IntegrationRow | undefined): CardState {
  return {
    enabled: row?.enabled ?? false,
    webhookUrl: row?.webhookUrl ?? "",
    notifyOnApproved: row?.notifyOnApproved ?? true,
    notifyOnRejected: row?.notifyOnRejected ?? true,
    notifyOnPending: row?.notifyOnPending ?? false,
    saveStatus: "idle",
    saveError: null,
    testStatus: "idle",
    testError: null,
  };
}

// ── Integration meta ──────────────────────────────────────────────────────────

const INTEGRATION_META = {
  teams: {
    name: "Microsoft Teams",
    icon: MessageSquare,
    iconColor: "text-blue-600",
    iconBg: "bg-blue-50",
    description:
      "Send rich Adaptive Card notifications to a Teams channel when tasks are approved or rejected.",
    docUrl:
      "https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook",
    envVar: "TEAMS_WEBHOOK_URL",
    placeholder: "https://your-org.webhook.office.com/...",
    instructions: [
      'In Teams, open the channel and click "⋯" → "Workflows"',
      'Search for "Post to a channel when a webhook request is received"',
      "Follow the wizard and copy the generated URL below",
    ],
  },
  basecamp: {
    name: "Basecamp",
    icon: Tent,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    description:
      "Post Campfire chat messages to a Basecamp project when task statuses change.",
    docUrl: "https://github.com/basecamp/bc3-api/blob/master/sections/chatbots.md",
    envVar: "BASECAMP_WEBHOOK_URL",
    placeholder: "https://3.basecamp.com/1234567/integrations/.../buckets/.../chats/.../lines",
    instructions: [
      'In Basecamp, open a project and click "Campfire"',
      'Click "Add a chatbot" and give it a name (e.g. "Marketing Portal")',
      "Copy the webhook URL and paste it below",
    ],
  },
} as const;

// ── Trigger checkboxes ────────────────────────────────────────────────────────

function TriggerCheckbox({
  id,
  label,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        checked ? "border-primary/30 bg-primary/5 text-foreground" : "border-border text-muted-foreground",
        disabled && "cursor-not-allowed opacity-50"
      )}
    >
      <input
        id={id}
        type="checkbox"
        className="h-4 w-4 rounded accent-primary"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-checked={checked}
      />
      {label}
    </label>
  );
}

// ── Single integration card ───────────────────────────────────────────────────

function IntegrationCard({
  integration,
  state,
  onChange,
  onSave,
  onTest,
}: {
  integration: "teams" | "basecamp";
  state: CardState;
  onChange: (patch: Partial<CardState>) => void;
  onSave: () => void;
  onTest: () => void;
}) {
  const meta = INTEGRATION_META[integration];
  const Icon = meta.icon;
  const [showInstructions, setShowInstructions] = useState(false);

  const isConnected = state.enabled && !!state.webhookUrl.trim();
  const hasEnvFallback =
    !state.webhookUrl.trim() &&
    (integration === "teams"
      ? !!process.env.NEXT_PUBLIC_TEAMS_CONFIGURED
      : !!process.env.NEXT_PUBLIC_BASECAMP_CONFIGURED);

  return (
    <Card className={cn(state.enabled && "border-primary/30 shadow-sm")}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", meta.iconBg)}>
              <Icon className={cn("h-5 w-5", meta.iconColor)} aria-hidden="true" />
            </div>
            <div>
              <CardTitle className="text-base">{meta.name}</CardTitle>
              <div className="mt-1 flex items-center gap-2">
                {isConnected ? (
                  <Badge variant="approved" className="gap-1 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Connected
                  </Badge>
                ) : state.enabled ? (
                  <Badge variant="pending" className="gap-1 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    URL missing
                  </Badge>
                ) : (
                  <Badge variant="draft" className="text-xs">Not configured</Badge>
                )}
                {hasEnvFallback && (
                  <span className="text-xs text-muted-foreground">
                    (env var set)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Enable/Disable switch */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Switch
              id={`${integration}-enabled`}
              checked={state.enabled}
              onCheckedChange={(v) => onChange({ enabled: v })}
              aria-label={`Enable ${meta.name} notifications`}
            />
            <Label htmlFor={`${integration}-enabled`} className="cursor-pointer text-xs text-muted-foreground">
              {state.enabled ? "Enabled" : "Disabled"}
            </Label>
          </div>
        </div>
        <CardDescription className="mt-2">{meta.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Webhook URL */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor={`${integration}-url`}>
              Webhook URL
              <span className="ml-1.5 rounded bg-muted px-1 py-0.5 font-mono text-xs text-muted-foreground">
                {meta.envVar}
              </span>
            </Label>
            <button
              type="button"
              onClick={() => setShowInstructions((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              aria-expanded={showInstructions}
            >
              <Info className="h-3.5 w-3.5" />
              {showInstructions ? "Hide guide" : "How to get URL"}
            </button>
          </div>

          {showInstructions && (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
              <ol className="space-y-1.5 list-none">
                {meta.instructions.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted-foreground/20 text-[10px] font-bold">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <a
                href={meta.docUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Full documentation
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <Input
            id={`${integration}-url`}
            type="url"
            placeholder={meta.placeholder}
            value={state.webhookUrl}
            onChange={(e) => onChange({ webhookUrl: e.target.value })}
            className="font-mono text-xs"
            aria-describedby={`${integration}-url-hint`}
          />
          <p id={`${integration}-url-hint`} className="text-xs text-muted-foreground">
            Stored securely — never exposed to the browser. Overrides the env variable when set.
          </p>
        </div>

        <Separator />

        {/* Notification triggers */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notify when a task is…
          </Label>
          <div className="flex flex-wrap gap-2">
            <TriggerCheckbox
              id={`${integration}-approved`}
              label="Approved"
              checked={state.notifyOnApproved}
              onChange={(v) => onChange({ notifyOnApproved: v })}
              disabled={!state.enabled}
            />
            <TriggerCheckbox
              id={`${integration}-rejected`}
              label="Rejected"
              checked={state.notifyOnRejected}
              onChange={(v) => onChange({ notifyOnRejected: v })}
              disabled={!state.enabled}
            />
            <TriggerCheckbox
              id={`${integration}-pending`}
              label="Submitted for Approval"
              checked={state.notifyOnPending}
              onChange={(v) => onChange({ notifyOnPending: v })}
              disabled={!state.enabled}
            />
          </div>
        </div>

        {/* Save / Test error messages */}
        {state.saveError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {state.saveError}
          </div>
        )}
        {state.testError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive" role="alert">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span><strong>Test failed:</strong> {state.testError}</span>
          </div>
        )}
        {state.testStatus === "ok" && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800" role="status">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Test message sent successfully! Check {meta.name}.
          </div>
        )}
        {state.saveStatus === "saved" && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800" role="status">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            Settings saved.
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={onSave}
            disabled={state.saveStatus === "saving"}
            className="flex-1"
          >
            {state.saveStatus === "saving" ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-3.5 w-3.5" /> Save Settings</>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onTest}
            disabled={state.testStatus === "testing" || !state.webhookUrl.trim()}
            title={!state.webhookUrl.trim() ? "Enter a webhook URL first" : "Send a test message"}
          >
            {state.testStatus === "testing" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Test
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

interface IntegrationSettingsFormProps {
  initialRows: IntegrationRow[];
  fetchError?: string;
}

export function IntegrationSettingsForm({
  initialRows,
  fetchError,
}: IntegrationSettingsFormProps) {
  const [states, setStates] = useState<Record<"teams" | "basecamp", CardState>>({
    teams: rowToCardState(initialRows.find((r) => r.integration === "teams")),
    basecamp: rowToCardState(initialRows.find((r) => r.integration === "basecamp")),
  });

  const [, startSave] = useTransition();
  const [, startTest] = useTransition();

  function patch(key: "teams" | "basecamp", update: Partial<CardState>) {
    setStates((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...update },
    }));
  }

  function handleSave(key: "teams" | "basecamp") {
    patch(key, { saveStatus: "saving", saveError: null });
    startSave(async () => {
      const s = states[key];
      const result = await saveIntegrationSettings({
        integration: key,
        enabled: s.enabled,
        webhookUrl: s.webhookUrl.trim() || null,
        notifyOnApproved: s.notifyOnApproved,
        notifyOnRejected: s.notifyOnRejected,
        notifyOnPending: s.notifyOnPending,
      });
      if (result.success) {
        patch(key, { saveStatus: "saved", saveError: null });
        setTimeout(() => patch(key, { saveStatus: "idle" }), 3000);
      } else {
        patch(key, { saveStatus: "error", saveError: result.error ?? "Save failed." });
      }
    });
  }

  function handleTest(key: "teams" | "basecamp") {
    patch(key, { testStatus: "testing", testError: null });
    startTest(async () => {
      const result = await testNotification({
        integration: key,
        webhookUrl: states[key].webhookUrl,
      });
      if (result.success) {
        patch(key, { testStatus: "ok" });
        setTimeout(() => patch(key, { testStatus: "idle" }), 5000);
      } else {
        patch(key, { testStatus: "error", testError: result.error ?? "Test failed." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* DB connection warning */}
      {fetchError && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Settings database not connected</p>
            <p className="mt-0.5 text-amber-700">{fetchError}</p>
            <p className="mt-1 text-amber-700">
              You can still configure integrations via the{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">TEAMS_WEBHOOK_URL</code> and{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">BASECAMP_WEBHOOK_URL</code> environment variables.
            </p>
          </div>
        </div>
      )}

      {/* Integration cards */}
      <div className="grid gap-6 xl:grid-cols-2">
        {(["teams", "basecamp"] as const).map((key) => (
          <IntegrationCard
            key={key}
            integration={key}
            state={states[key]}
            onChange={(patch_) => patch(key, patch_)}
            onSave={() => handleSave(key)}
            onTest={() => handleTest(key)}
          />
        ))}
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium text-foreground">Security note</p>
          <p>
            Webhook URLs are stored in your Supabase database and only accessible to managers and admins.
            All webhook requests originate from the server — they are never exposed to browser clients.
          </p>
        </div>
      </div>
    </div>
  );
}

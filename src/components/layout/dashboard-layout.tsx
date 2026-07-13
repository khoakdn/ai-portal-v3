import { Sidebar } from "@/components/layout/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { FloatingCopilot } from "@/components/layout/floating-copilot";
import { ReviewerFeedbackNotification } from "@/components/shared/reviewer-feedback-notification";
import { ReviewerNotificationProvider } from "@/contexts/reviewer-notification-context";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ReviewerNotificationProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-6xl px-6 py-7 animate-fade-in">
              {children}
            </div>
          </main>
        </div>

        {/* Native DeltaPR workflow guide chat */}
        <FloatingCopilot />
        <ReviewerFeedbackNotification />
      </div>
    </ReviewerNotificationProvider>
  );
}

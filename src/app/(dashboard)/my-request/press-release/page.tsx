export const dynamic = 'force-dynamic';

import { FileText } from "lucide-react";
import { PressReleaseStudio } from "@/components/my-request/press-release-studio";

export const metadata = { title: "Press Release Studio — AI Portal" };

export default function PressReleasePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <FileText className="h-5 w-5 text-[#0087DC]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Press Release Studio</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Turn bullet points into a polished, publication-ready announcement with Gemini AI.
          </p>
        </div>
      </div>
      <PressReleaseStudio />
    </div>
  );
}

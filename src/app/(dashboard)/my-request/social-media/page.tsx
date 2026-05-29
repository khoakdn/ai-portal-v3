export const dynamic = 'force-dynamic';

import { Share2 } from "lucide-react";
import { SocialMediaStudio } from "@/components/my-request/social-media-studio";

export const metadata = { title: "Social Media Studio — AI Portal" };

export default function SocialMediaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
          <Share2 className="h-5 w-5 text-[#0087DC]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Social Media Studio</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Craft compelling LinkedIn posts, X threads, and Instagram captions with Gemini AI.
          </p>
        </div>
      </div>
      <SocialMediaStudio />
    </div>
  );
}

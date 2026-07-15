"use client";

import Image from "next/image";
import { Globe, Heart, MessageCircle, Send, ThumbsUp } from "lucide-react";
import { SocialSkeleton } from "@/components/ui/skeleton-loader";
import { cn } from "@/lib/utils";
import {
  INSTAGRAM_MOCKUP_IMAGE_URL,
  type SocialPlatform,
} from "@/lib/demo/social-media-formats";

const LINKEDIN_CHAR_LIMIT = 3000;
const INSTAGRAM_CHAR_LIMIT = 2200;

interface SocialPostPreviewProps {
  platform: SocialPlatform;
  body: string;
  onChange?: (v: string) => void;
  isEditable?: boolean;
  isGenerating?: boolean;
  highlightClassName?: string;
}

export function SocialPostPreview({
  platform,
  body,
  onChange,
  isEditable = false,
  isGenerating = false,
  highlightClassName,
}: SocialPostPreviewProps) {
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const charLimit = platform === "linkedin" ? LINKEDIN_CHAR_LIMIT : INSTAGRAM_CHAR_LIMIT;
  const charCount = body.length;
  const overLimit = charCount > charLimit;

  if (platform === "instagram") {
    return (
      <div className={cn("rounded-xl transition-all duration-1000", highlightClassName)}>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] p-[2px]">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#0087DC]">
                DM
              </div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-slate-900">delta_electronics</p>
              <p className="text-[11px] text-slate-400">Sponsored · {today}</p>
            </div>
          </div>
          <div className="relative aspect-square w-full bg-slate-100">
            <Image
              src={INSTAGRAM_MOCKUP_IMAGE_URL}
              alt="Delta UFC500 ultra-fast EV charger showcase"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 480px"
              unoptimized
            />
          </div>
          <div className="space-y-2 px-4 py-3">
            <div className="flex gap-3 text-slate-700">
              <Heart className="h-5 w-5" />
              <MessageCircle className="h-5 w-5" />
              <Send className="h-5 w-5" />
            </div>
            {isGenerating ? (
              <SocialSkeleton />
            ) : isEditable && onChange && body ? (
              <textarea
                value={body}
                onChange={(e) => onChange(e.target.value)}
                maxLength={charLimit}
                aria-label="Instagram caption editor"
                className="min-h-[140px] w-full resize-none bg-transparent text-[13px] leading-[1.75] text-slate-800 outline-none"
              />
            ) : (
              <p className="whitespace-pre-wrap text-[13px] leading-[1.75] text-slate-800">{body}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl bg-[#F3F2EF] p-3 transition-all duration-1000", highlightClassName)}>
      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#0087DC] to-blue-600 text-sm font-bold text-white shadow-sm">
            DM
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-gray-900">Delta Marketing Team</p>
            <p className="text-[11px] leading-tight text-gray-500">
              Marketing &amp; Communications · Delta Corp
            </p>
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-400">
              <span>{today}</span>
              <span>·</span>
              <Globe className="h-3 w-3" aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="px-4 pb-3">
          {isGenerating ? (
            <SocialSkeleton />
          ) : isEditable && onChange && body ? (
            <textarea
              value={body}
              onChange={(e) => onChange(e.target.value)}
              maxLength={charLimit}
              aria-label="LinkedIn post content editor"
              className="min-h-[160px] w-full resize-none bg-transparent text-[13.5px] leading-[1.7] text-gray-800 outline-none"
            />
          ) : (
            <p className="whitespace-pre-wrap text-[13.5px] leading-[1.7] text-gray-800">{body}</p>
          )}
        </div>
        <div className="flex items-center justify-around border-t border-gray-100 px-2 py-0.5">
          {[
            { icon: ThumbsUp, label: "Like" },
            { icon: MessageCircle, label: "Comment" },
            { icon: Send, label: "Send" },
          ].map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold text-gray-500"
            >
              <Icon className="h-4 w-4" />
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

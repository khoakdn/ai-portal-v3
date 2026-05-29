import { ContentGeneratorForm } from "@/components/content/content-generator-form";
import type { ContentType } from "@/types/database";

export const dynamic = 'force-dynamic';

interface ContentPageProps {
  searchParams: Promise<{ type?: string }>;
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const params = await searchParams;
  const defaultType: ContentType =
    params.type === "social_post" ? "social_post" : "press_release";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Content Generator</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn bullet points into polished press releases and social media posts using Gemini AI.
        </p>
      </div>
      <ContentGeneratorForm defaultType={defaultType} />
    </div>
  );
}

import { InvoiceUploadForm } from "@/components/invoices/invoice-upload-form";

export default function InvoicesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Invoice Analyzer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a PDF or image invoice. Gemini AI extracts all key data and routes it straight into your approval workflow.
        </p>
      </div>

      <div className="mx-auto max-w-2xl">
        <InvoiceUploadForm />
      </div>
    </div>
  );
}

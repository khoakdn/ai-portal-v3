export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          role?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: "content_draft" | "invoice";
          status: "draft" | "pending_approval" | "approved" | "rejected" | "needs_revisions";
          version: number;
          created_by: string | null;
          assignee_id: string | null;
          content_draft_id: string | null;
          invoice_id: string | null;
          submitted_at: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          title: string;
          type: "content_draft" | "invoice";
          created_by?: string | null;
          description?: string | null;
          status?: "draft" | "pending_approval" | "approved" | "rejected" | "needs_revisions";
          version?: number;
          assignee_id?: string | null;
          content_draft_id?: string | null;
          invoice_id?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rejection_reason?: string | null;
        };
        Update: {
          title?: string;
          description?: string | null;
          type?: "content_draft" | "invoice";
          status?: "draft" | "pending_approval" | "approved" | "rejected" | "needs_revisions";
          version?: number;
          created_by?: string | null;
          assignee_id?: string | null;
          content_draft_id?: string | null;
          invoice_id?: string | null;
          submitted_at?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          rejection_reason?: string | null;
        };
        Relationships: [];
      };
      task_activity: {
        Row: {
          id: string;
          task_id: string;
          action: "draft_saved" | "submitted" | "approved" | "rejected" | "changes_requested" | "resubmitted" | "assigned";
          feedback_text: string | null;
          snapshot_content: string | null;
          actor_name: string | null;
          version: number;
          created_at: string;
        };
        Insert: {
          task_id: string;
          action: "draft_saved" | "submitted" | "approved" | "rejected" | "changes_requested" | "resubmitted" | "assigned";
          feedback_text?: string | null;
          snapshot_content?: string | null;
          actor_name?: string | null;
          version?: number;
        };
        Update: Partial<Database["public"]["Tables"]["task_activity"]["Insert"]>;
        Relationships: [];
      };
      content_drafts: {
        Row: {
          id: string;
          type: "press_release" | "social_post";
          title: string;
          bullet_points: string;
          generated_body: string;
          edited_body: string | null;
          ai_model: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          type: "press_release" | "social_post";
          title: string;
          bullet_points: string;
          generated_body?: string;
          edited_body?: string | null;
          ai_model?: string | null;
          created_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["content_drafts"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: {
          id: string;
          file_name: string;
          file_url: string;
          file_mime_type: string;
          vendor: string | null;
          total_amount: number | null;
          currency: string | null;
          due_date: string | null;
          invoice_number: string | null;
          extracted_raw: Json | null;
          ai_model: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          file_name: string;
          file_url: string;
          file_mime_type: string;
          created_by?: string | null;
          vendor?: string | null;
          total_amount?: number | null;
          currency?: string | null;
          due_date?: string | null;
          invoice_number?: string | null;
          extracted_raw?: Json | null;
          ai_model?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number | null;
          unit_price: number | null;
          amount: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          invoice_id: string;
          description: string;
          amount: number;
          quantity?: number | null;
          unit_price?: number | null;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_line_items"]["Insert"]>;
        Relationships: [];
      };
      integration_settings: {
        Row: {
          id: string;
          integration: "teams" | "basecamp";
          enabled: boolean;
          webhook_url: string | null;
          notify_on_approved: boolean;
          notify_on_rejected: boolean;
          notify_on_pending: boolean;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          integration: "teams" | "basecamp";
          enabled?: boolean;
          webhook_url?: string | null;
          notify_on_approved?: boolean;
          notify_on_rejected?: boolean;
          notify_on_pending?: boolean;
          updated_by?: string | null;
        };
        Update: {
          enabled?: boolean;
          webhook_url?: string | null;
          notify_on_approved?: boolean;
          notify_on_rejected?: boolean;
          notify_on_pending?: boolean;
          updated_by?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      task_status: "draft" | "pending_approval" | "approved" | "rejected" | "needs_revisions";
      task_type: "content_draft" | "invoice";
      content_type: "press_release" | "social_post";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

/**
 * Supabase adapter for NextAuth — stores users and magic-link verification tokens.
 * Required by EmailProvider even when using JWT session strategy.
 */

import { createClient } from "@supabase/supabase-js";
import type { Adapter, AdapterUser } from "next-auth/adapters";

interface AuthUserRow {
  id: string;
  name: string | null;
  email: string | null;
  email_verified: string | null;
  image: string | null;
}

interface VerificationTokenRow {
  identifier: string;
  token: string;
  expires: string;
}

function mapUser(row: AuthUserRow) {
  return {
    id: row.id,
    name: row.name,
    email: row.email ?? "",
    emailVerified: row.email_verified ? new Date(row.email_verified) : null,
    image: row.image,
  };
}

export function SupabaseAuthAdapter(): Adapter {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return {
    async createUser(user: AdapterUser) {
      const { data, error } = await supabase
        .from("auth_users")
        .insert({
          name: user.name,
          email: user.email,
          email_verified: user.emailVerified?.toISOString() ?? null,
          image: user.image,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to create auth user: ${error?.message}`);
      }

      return mapUser(data as AuthUserRow);
    },

    async getUser(id) {
      const { data } = await supabase
        .from("auth_users")
        .select()
        .eq("id", id)
        .maybeSingle();

      return data ? mapUser(data as AuthUserRow) : null;
    },

    async getUserByEmail(email) {
      const { data } = await supabase
        .from("auth_users")
        .select()
        .eq("email", email)
        .maybeSingle();

      return data ? mapUser(data as AuthUserRow) : null;
    },

    async getUserByAccount() {
      return null;
    },

    async updateUser(user) {
      const { data, error } = await supabase
        .from("auth_users")
        .update({
          name: user.name,
          email: user.email,
          email_verified: user.emailVerified?.toISOString() ?? null,
          image: user.image,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to update auth user: ${error?.message}`);
      }

      return mapUser(data as AuthUserRow);
    },

    async deleteUser() {
      /* Not used for email-only auth */
    },

    async linkAccount() {
      /* Not used for email-only auth */
    },

    async unlinkAccount() {
      /* Not used for email-only auth */
    },

    async createSession() {
      throw new Error("Session adapter methods are not used with JWT strategy.");
    },

    async getSessionAndUser() {
      return null;
    },

    async updateSession() {
      throw new Error("Session adapter methods are not used with JWT strategy.");
    },

    async deleteSession() {
      /* Not used with JWT strategy */
    },

    async createVerificationToken(token) {
      const { data, error } = await supabase
        .from("auth_verification_tokens")
        .insert({
          identifier: token.identifier,
          token: token.token,
          expires: token.expires.toISOString(),
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(`Failed to create verification token: ${error?.message}`);
      }

      const row = data as VerificationTokenRow;
      return {
        identifier: row.identifier,
        token: row.token,
        expires: new Date(row.expires),
      };
    },

    async useVerificationToken({ identifier, token }) {
      const { data, error } = await supabase
        .from("auth_verification_tokens")
        .delete()
        .eq("identifier", identifier)
        .eq("token", token)
        .select()
        .maybeSingle();

      if (error || !data) return null;

      const row = data as VerificationTokenRow;
      return {
        identifier: row.identifier,
        token: row.token,
        expires: new Date(row.expires),
      };
    },
  };
}

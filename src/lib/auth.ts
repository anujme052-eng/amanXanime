import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const EMAIL_DOMAIN = "app.local";

export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
}

export function emailForUsername(username: string): string {
  return `${username || "user"}@${EMAIL_DOMAIN}`;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const normalized = normalizeUsername(username);
  if (!normalized) return false;
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .ilike("username", normalized);
  if (error) return true; // don't block signup on a check failure
  return data.length === 0;
}

export async function signUpWithUsername(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const { data, error } = await supabase.auth.signUp({
    email: emailForUsername(normalized),
    password,
    options: { data: { username: normalized } },
  });
  return { session: data?.session ?? null, error: error?.message ?? null };
}

export async function signInWithUsername(username: string, password: string) {
  const normalized = normalizeUsername(username);
  const { error } = await supabase.auth.signInWithPassword({
    email: emailForUsername(normalized),
    password,
  });
  return { error: error?.message ?? null };
}

export async function getCurrentUsername(): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userData.user.id)
    .maybeSingle();
  return data?.username ?? null;
}

export async function signOutWithCleanup(queryClient: QueryClient) {
  await queryClient.cancelQueries();
  queryClient.clear();
  await supabase.auth.signOut();
}

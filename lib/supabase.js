import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const table = process.env.NEXT_PUBLIC_SUPABASE_WINES_TABLE || "wines";

export const hasSupabaseConfig = Boolean(url && anonKey);

const supabase = hasSupabaseConfig ? createClient(url, anonKey) : null;

function ensureSupabase() {
  if (!supabase) {
    throw new Error("Supabase non configure");
  }
}

async function requireUserId() {
  ensureSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  const user = data?.user;
  if (!user) {
    throw new Error("Utilisateur non authentifie");
  }
  return user.id;
}

export async function getCurrentSession() {
  ensureSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signUp(email, password) {
  ensureSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  ensureSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  ensureSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback) {
  ensureSupabase();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

export function isAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  const code = String(error?.code || "").toLowerCase();
  return (
    message.includes("jwt") ||
    message.includes("token") ||
    message.includes("session") ||
    message.includes("auth") ||
    message.includes("non authentifie") ||
    code === "pgrst301"
  );
}

export async function fetchWines() {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addWine(wine) {
  const userId = await requireUserId();
  const payload = {
    id: wine.id,
    user_id: userId,
    name: wine.name,
    year: wine.year,
    region: wine.region,
    grape: wine.grape,
    quantity: wine.quantity,
    notes: wine.notes,
    updated_at: wine.updatedAt,
  };

  const { data, error } = await supabase.from(table).upsert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateWine(wine) {
  const userId = await requireUserId();
  const payload = {
    name: wine.name,
    year: wine.year,
    region: wine.region,
    grape: wine.grape,
    quantity: wine.quantity,
    notes: wine.notes,
    updated_at: wine.updatedAt,
  };

  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", wine.id)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWine(id) {
  const userId = await requireUserId();
  const { error } = await supabase.from(table).delete().eq("id", id).eq("user_id", userId);
  if (error) throw error;
}

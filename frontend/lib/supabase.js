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

export async function fetchWines() {
  ensureSupabase();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addWine(input) {
  ensureSupabase();
  const payload = {
    name: input.name?.trim() || "",
    year: input.year?.trim() || "",
    region: input.region?.trim() || "",
    grape: input.grape?.trim() || "",
    quantity: Number(input.quantity) || 0,
    notes: input.notes?.trim() || "",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateWine(id, input) {
  ensureSupabase();
  const payload = {
    name: input.name?.trim() || "",
    year: input.year?.trim() || "",
    region: input.region?.trim() || "",
    grape: input.grape?.trim() || "",
    quantity: Number(input.quantity) || 0,
    notes: input.notes?.trim() || "",
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(table)
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteWine(id) {
  ensureSupabase();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function replaceAllWines(rows) {
  ensureSupabase();

  const { error: deleteError } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) throw deleteError;

  if (!rows.length) return [];

  const payload = rows.map((row) => ({
    name: row.name?.trim() || "",
    year: row.year?.trim() || "",
    region: row.region?.trim() || "",
    grape: row.grape?.trim() || "",
    quantity: Number(row.quantity) || 0,
    notes: row.notes?.trim() || "",
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase.from(table).insert(payload).select();
  if (error) throw error;
  return data || [];
}

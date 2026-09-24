import { supabase } from "./supabaseClient.js";

const WORKING_HOURS_KEY = "working_hours";

export async function getWorkingHours(): Promise<boolean> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", WORKING_HOURS_KEY)
    .single();
  if (error) throw error;
  return data?.value ?? false;
}

export async function setWorkingHours(value: boolean): Promise<void> {
  const { error } = await supabase
    .from("app_settings")
    .update({ value })
    .eq("key", WORKING_HOURS_KEY);
  if (error) throw error;
}

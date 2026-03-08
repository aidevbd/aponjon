import { supabase } from "@/integrations/supabase/client";

export interface ContactRow {
  id: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  imo: string | null;
  telegram: string | null;
  facebook: string | null;
  email: string | null;
  category: string;
  custom_category: string | null;
  note: string | null;
  address: string | null;
  blood_group: string | null;
  birthday: string | null;
  secret_code: string | null;
  secret_code_hash?: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Admin Auth ----------
export async function adminLogin(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function adminLogout() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ---------- Contacts (Admin – authenticated) ----------
export async function getContacts(): Promise<ContactRow[]> {
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveContact(contact: {
  name: string;
  phone: string;
  whatsapp?: string;
  imo?: string;
  telegram?: string;
  facebook?: string;
  email?: string;
  category: string;
  custom_category?: string;
  note?: string;
  address?: string;
  blood_group?: string;
  birthday?: string;
  secret_code?: string;
  photo_url?: string;
}) {
  const { data, error } = await supabase.rpc("save_contact_with_hash", {
    p_name: contact.name,
    p_phone: contact.phone,
    p_whatsapp: contact.whatsapp || null,
    p_imo: contact.imo || null,
    p_telegram: contact.telegram || null,
    p_facebook: contact.facebook || null,
    p_email: contact.email || null,
    p_category: contact.category || "অন্যান্য",
    p_custom_category: contact.custom_category || null,
    p_note: contact.note || null,
    p_address: contact.address || null,
    p_blood_group: contact.blood_group || null,
    p_birthday: contact.birthday || null,
    p_secret_code: contact.secret_code || null,
    p_photo_url: contact.photo_url || null,
  } as any);
  if (error) throw error;
  return data;
}

export async function updateContact(id: string, updates: Partial<ContactRow>) {
  const { error } = await supabase.from("contacts").update(updates).eq("id", id);
  if (error) throw error;
}

export async function deleteContact(id: string) {
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- Public verification (RPC functions) ----------
export async function verifyContactByPhone(phone: string) {
  const { data, error } = await supabase.rpc("verify_contact_by_phone", { p_phone: phone });
  if (error) throw error;
  return data?.[0] || null;
}

export async function verifySecretCode(secretCode: string) {
  const { data, error } = await supabase.rpc("verify_secret_code", { p_secret_code: secretCode });
  if (error) throw error;
  return data || [];
}

export async function verifyAndGetContact(phone: string, secretCode: string) {
  const { data, error } = await supabase.rpc("verify_and_get_contact", {
    p_phone: phone,
    p_secret_code: secretCode,
  });
  if (error) throw error;
  return data?.[0] || null;
}

export async function updateVerifiedContact(
  phone: string,
  secretCode: string,
  updates: {
    name?: string;
    whatsapp?: string;
    imo?: string;
    telegram?: string;
    email?: string;
    category?: string;
    custom_category?: string;
    note?: string;
    address?: string;
    blood_group?: string;
    birthday?: string;
  }
) {
  const { data, error } = await supabase.rpc("update_verified_contact", {
    p_phone: phone,
    p_secret_code: secretCode,
    p_name: updates.name || null,
    p_whatsapp: updates.whatsapp || null,
    p_imo: updates.imo || null,
    p_telegram: updates.telegram || null,
    p_email: updates.email || null,
    p_category: updates.category || null,
    p_custom_category: updates.custom_category || null,
    p_note: updates.note || null,
    p_address: updates.address || null,
    p_blood_group: updates.blood_group || null,
    p_birthday: updates.birthday || null,
  } as any);
  if (error) throw error;
  return data;
}

// ---------- OTP ----------
export async function generateOtp(phone: string) {
  const { data, error } = await supabase.rpc("generate_otp", { p_phone: phone });
  if (error) throw error;
  return data; // Returns OTP code, 'RATE_LIMITED', 'NOT_FOUND', or 'DAILY_LIMIT'
}

export async function verifyOtp(phone: string, code: string) {
  const { data, error } = await supabase.rpc("verify_otp", { p_phone: phone, p_code: code });
  if (error) throw error;
  return data;
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 3) + "****" + phone.slice(-2);
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { deriveMessengers } from "@/components/PhoneWithMessengers";
import type { PhoneEntry } from "@/components/PhoneWithMessengers";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { matchesFuzzy } from "@/lib/banglaSearch";
import { logAdminActivity } from "@/lib/adminLog";
import { getContacts, deleteContact, updateContact, saveContact, type ContactRow } from "@/lib/store";
import type { AddContactPayload, DuplicateInfo } from "@/components/admin/adminContactTypes";

/**
 * Contact data layer for the admin dashboard: fetching, search/filter state,
 * derived stats, birthday reminders, CRUD and CSV export.
 */
export function useAdminContacts() {
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterBloodGroup, setFilterBloodGroup] = useState("all");
  const [isSaving, setIsSaving] = useState(false);
  const birthdayNotified = useRef(false);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try { setContacts(await getContacts()); }
    catch { toast.error("ডাটা লোড করতে সমস্যা হয়েছে"); }
    finally { setLoading(false); }
  }, []);

  const debouncedSearch = useDebouncedValue(search, 150);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim();
    return contacts.filter((c) => {
      const matchSearch = !q || [
        c.name, c.phone, c.blood_group, c.note, c.address, c.email,
        c.whatsapp, c.imo, c.telegram, c.facebook, c.custom_category,
      ].some((v) => matchesFuzzy(v, q));
      const matchCategory = filterCategory === "all" || c.category === filterCategory;
      const matchBlood = filterBloodGroup === "all" || c.blood_group === filterBloodGroup;
      return matchSearch && matchCategory && matchBlood;
    });
  }, [contacts, debouncedSearch, filterCategory, filterBloodGroup]);

  const resetFilters = useCallback(() => {
    setSearch(""); setFilterCategory("all"); setFilterBloodGroup("all");
  }, []);

  const stats = useMemo(() => {
    const categoryCount: Record<string, number> = {};
    contacts.forEach((c) => { categoryCount[c.category] = (categoryCount[c.category] || 0) + 1; });
    return { total: contacts.length, categoryCount };
  }, [contacts]);

  const upcomingBirthdays = useMemo(() => {
    const today = new Date();
    const upcoming: { contact: ContactRow; daysUntil: number }[] = [];
    contacts.forEach((c) => {
      if (!c.birthday) return;
      const bday = new Date(c.birthday);
      const thisYear = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
      if (thisYear < today) thisYear.setFullYear(today.getFullYear() + 1);
      const diff = Math.ceil((thisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff <= 30) upcoming.push({ contact: c, daysUntil: diff });
    });
    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }, [contacts]);

  useEffect(() => {
    if (birthdayNotified.current || upcomingBirthdays.length === 0) return;
    birthdayNotified.current = true;
    const todayBdays = upcomingBirthdays.filter((b) => b.daysUntil === 0);
    const soonBdays = upcomingBirthdays.filter((b) => b.daysUntil > 0 && b.daysUntil <= 7);
    if (todayBdays.length > 0) {
      toast("🎂 আজ জন্মদিন!", { description: todayBdays.map((b) => b.contact.name).join(", ") });
    } else if (soonBdays.length > 0) {
      toast("🎂 আসন্ন জন্মদিন!", { description: soonBdays.map((b) => `${b.contact.name} (${b.daysUntil} দিন বাকি)`).join(", ") });
    }
  }, [upcomingBirthdays]);

  /**
   * Creates a contact — or reports a duplicate phone so the caller can ask
   * for confirmation and retry with `force`.
   */
  const addContact = useCallback(async (
    payload: AddContactPayload,
    force = false,
  ): Promise<{ ok: boolean; duplicate?: DuplicateInfo }> => {
    if (isSaving) return { ok: false };
    const primaryPhone = payload.phones[0]?.number.trim();
    if (!payload.name.trim() || !primaryPhone) {
      toast.error("নাম এবং ফোন নম্বর আবশ্যক");
      return { ok: false };
    }
    const messengers = deriveMessengers(payload.phones);
    const existing = contacts.find((c) => c.phone === primaryPhone);
    if (existing && !force) {
      return { ok: false, duplicate: { existingName: existing.name, phone: primaryPhone } };
    }

    setIsSaving(true);
    try {
      if (existing) {
        await updateContact(existing.id, {
          name: payload.name, phone: primaryPhone, whatsapp: messengers.whatsapp, imo: messengers.imo,
          telegram: messengers.telegram, facebook: payload.facebook || null, email: payload.email || null,
          category: payload.category || "অন্যান্য", custom_category: payload.customCategory || null,
          note: payload.note || null, address: payload.address || null, blood_group: payload.bloodGroup || null,
          birthday: payload.birthday || null, photo_url: payload.photoUrl || null,
        });
        toast.success("কন্টাক্ট আপডেট হয়েছে! ✅");
      } else {
        // save_contact_with_hash RPC so secret_code is hashed & persisted
        await saveContact({
          name: payload.name,
          phone: primaryPhone,
          whatsapp: messengers.whatsapp || undefined,
          imo: messengers.imo || undefined,
          telegram: messengers.telegram || undefined,
          facebook: payload.facebook || undefined,
          email: payload.email || undefined,
          category: payload.category || "অন্যান্য",
          custom_category: payload.customCategory || undefined,
          note: payload.note || undefined,
          address: payload.address || undefined,
          blood_group: payload.bloodGroup || undefined,
          birthday: payload.birthday || undefined,
          secret_code: payload.secretCode || undefined,
          photo_url: payload.photoUrl || undefined,
        });
        toast.success("নতুন কন্টাক্ট যোগ হয়েছে! 💕");
        logAdminActivity("contact_add", `নতুন কন্টাক্ট যোগ: ${payload.name} (${primaryPhone})`, undefined, "contact", { name: payload.name, phone: primaryPhone });
      }
      await loadContacts();
      return { ok: true };
    } catch {
      toast.error(existing ? "আপডেট করতে সমস্যা হয়েছে" : "সেভ করতে সমস্যা হয়েছে");
      return { ok: false };
    } finally {
      setIsSaving(false);
    }
  }, [contacts, isSaving, loadContacts]);

  const saveEdit = useCallback(async (
    contact: ContactRow,
    form: Partial<ContactRow>,
    phones: PhoneEntry[],
  ): Promise<boolean> => {
    try {
      const messengers = deriveMessengers(phones);
      await updateContact(contact.id, {
        name: form.name, phone: form.phone, whatsapp: messengers.whatsapp, imo: messengers.imo,
        telegram: messengers.telegram, facebook: form.facebook || null, email: form.email || null,
        category: form.category, custom_category: form.custom_category || null,
        note: form.note || null, address: form.address || null,
        blood_group: form.blood_group || null, birthday: form.birthday || null,
        photo_url: form.photo_url || null,
      });
      await loadContacts();
      toast.success("তথ্য আপডেট হয়েছে! 💕");
      logAdminActivity("contact_edit", `কন্টাক্ট এডিট: ${form.name} (${form.phone})`, contact.id, "contact", { name: form.name, phone: form.phone });
      return true;
    } catch {
      toast.error("আপডেট করতে সমস্যা হয়েছে");
      return false;
    }
  }, [loadContacts]);

  const removeContact = useCallback(async (id: string) => {
    const contact = contacts.find((c) => c.id === id);
    try {
      await deleteContact(id);
      await loadContacts();
      toast.success("কন্টাক্ট ডিলিট হয়েছে");
      logAdminActivity("contact_delete", `কন্টাক্ট ডিলিট: ${contact?.name || "অজানা"} (${contact?.phone || ""})`, id, "contact", { name: contact?.name, phone: contact?.phone });
    } catch (err) {
      console.error("[delete contact]", err);
      toast.error("ডিলিট করতে সমস্যা হয়েছে");
    }
  }, [contacts, loadContacts]);

  const exportCSV = useCallback(() => {
    const headers = ["নাম", "ফোন", "WhatsApp", "IMO", "Telegram", "Facebook", "ইমেইল", "ক্যাটাগরি", "ঠিকানা", "রক্তের গ্রুপ", "জন্মদিন", "নোট"];
    const rows = contacts.map((c) => [c.name, c.phone, c.whatsapp || "", c.imo || "", c.telegram || "", c.facebook || "", c.email || "", c.category, c.address || "", c.blood_group || "", c.birthday || "", c.note || ""]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "aponjon-contacts.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV ডাউনলোড হচ্ছে...");
    logAdminActivity("export_csv", `${contacts.length} টি কন্টাক্ট CSV এক্সপোর্ট করা হয়েছে`, undefined, "export", { count: contacts.length });
  }, [contacts]);

  return {
    contacts, loading, loadContacts,
    search, setSearch, debouncedSearch,
    filterCategory, setFilterCategory,
    filterBloodGroup, setFilterBloodGroup,
    filtered, resetFilters,
    stats, upcomingBirthdays,
    isSaving, addContact, saveEdit, removeContact, exportCSV,
  };
}

import type { PhoneEntry } from "@/components/PhoneWithMessengers";

/** Payload produced by the "add contact" modal. */
export interface AddContactPayload {
  name: string;
  phones: PhoneEntry[];
  facebook: string;
  email: string;
  category: string;
  customCategory: string;
  note: string;
  address: string;
  bloodGroup: string;
  birthday: string;
  secretCode: string;
  photoUrl: string;
}

export const emptyAddContactPayload: AddContactPayload = {
  name: "",
  phones: [{ number: "", hasWhatsApp: false, hasIMO: false, hasTelegram: false }],
  facebook: "",
  email: "",
  category: "অন্যান্য",
  customCategory: "",
  note: "",
  address: "",
  bloodGroup: "",
  birthday: "",
  secretCode: "",
  photoUrl: "",
};

export interface DuplicateInfo {
  existingName: string;
  phone: string;
}

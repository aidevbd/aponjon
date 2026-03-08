import { Contact } from "./types";

const STORAGE_KEY = "aponjon_contacts";
const ADMIN_KEY = "aponjon_admin";

export function getContacts(): Contact[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveContact(contact: Contact): void {
  const contacts = getContacts();
  contacts.push(contact);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function updateContact(id: string, updates: Partial<Contact>): void {
  const contacts = getContacts();
  const index = contacts.findIndex((c) => c.id === id);
  if (index !== -1) {
    contacts[index] = { ...contacts[index], ...updates, updatedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  }
}

export function deleteContact(id: string): void {
  const contacts = getContacts().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
}

export function findContactByPhone(phone: string): Contact | undefined {
  return getContacts().find((c) => c.phone === phone);
}

export function findContactsBySecretCode(code: string): Contact[] {
  return getContacts().filter((c) => c.secretCode === code);
}

export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return phone.slice(0, 3) + "****" + phone.slice(-2);
}

// Simple admin auth with localStorage
export function isAdminLoggedIn(): boolean {
  return localStorage.getItem(ADMIN_KEY) === "true";
}

export function adminLogin(password: string): boolean {
  // Default admin password - should be changed
  if (password === "aponjon2024") {
    localStorage.setItem(ADMIN_KEY, "true");
    return true;
  }
  return false;
}

export function adminLogout(): void {
  localStorage.removeItem(ADMIN_KEY);
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

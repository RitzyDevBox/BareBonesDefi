import { useCallback, useEffect, useState } from "react";

/**
 * A user-saved contact (the "address book" entries the user adds by hand).
 *
 * Today these live in `localStorage`. The hook below is the only place that
 * touches storage, so swapping to a backend API later means writing a new
 * `useContactsStore` impl with the same return shape — no changes downstream.
 */
export interface SavedContact {
  address: string;
  name: string;
  note?: string;
}

export interface ContactsStore {
  contacts: SavedContact[];
  loading: boolean;
  add: (contact: SavedContact) => void;
  remove: (address: string) => void;
}

const STORAGE_KEY = "bb-address-book.v1";

function readContacts(): SavedContact[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is SavedContact =>
        c && typeof c.address === "string" && typeof c.name === "string"
    );
  } catch {
    return [];
  }
}

function writeContacts(contacts: SavedContact[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(contacts));
  } catch {
    // Quota or private mode — silent. The in-memory state still works for
    // the rest of the session.
  }
}

/**
 * localStorage-backed contacts store. Synchronous reads; writes also notify
 * other tabs via the `storage` event (free with localStorage).
 *
 * To replace with a backend later: write a sibling hook that returns the same
 * `ContactsStore` shape (e.g. via tanstack-query) and re-export it from the
 * barrel. Call sites consume the interface, not the impl.
 */
export function useContactsStore(): ContactsStore {
  const [contacts, setContacts] = useState<SavedContact[]>(() => readContacts());
  // `loading` is always false for the localStorage impl — surfaced in the
  // interface so a future API-backed impl can flip it true during fetches.
  const loading = false;

  // Keep multiple tabs in sync.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY) return;
      setContacts(readContacts());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const add = useCallback((contact: SavedContact) => {
    setContacts((current) => {
      const lower = contact.address.toLowerCase();
      const without = current.filter((c) => c.address.toLowerCase() !== lower);
      const next = [...without, contact];
      writeContacts(next);
      return next;
    });
  }, []);

  const remove = useCallback((address: string) => {
    setContacts((current) => {
      const lower = address.toLowerCase();
      const next = current.filter((c) => c.address.toLowerCase() !== lower);
      writeContacts(next);
      return next;
    });
  }, []);

  return { contacts, loading, add, remove };
}

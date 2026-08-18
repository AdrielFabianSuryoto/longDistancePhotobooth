/**
 * Satu-satunya tempat untuk mengubah identitas pasangan & kredensial.
 *
 * `email` harus SAMA PERSIS dengan email akun di Supabase → Authentication →
 * Users, karena itulah yang dipakai untuk login. `birthday` hanya dicek di
 * browser sebagai lapisan personal; yang benar-benar mengamankan adalah
 * SECRET_CODE, yang dipakai sebagai password Supabase.
 */

export type UserId = "adriel" | "maria";

export type Person = {
  id: UserId;
  name: string;
  initial: string;
  /** format YYYY-MM-DD, sama dengan nilai <input type="date"> */
  birthday: string;
  email: string;
};

export const PEOPLE: Record<UserId, Person> = {
  adriel: {
    id: "adriel",
    name: "Adriel",
    initial: "A",
    birthday: "2003-04-18",
    email: "adrielsuryoto@gmail.com",
  },
  maria: {
    id: "maria",
    name: "Maria",
    initial: "M",
    birthday: "2006-01-08",
    email: "mmariaavelina@gmail.com",
  },
};

/** Kode rahasia bersama untuk masuk ke ruang privat. */
export const SECRET_CODE = "24Juli2026";

export const APP_NAME = "Our Long Distance Photobooth";
export const APP_SHORT_NAME = "Our Booth";
export const SENDER_EMAIL = "hello@ourbooth.love";

export function getPerson(id: UserId): Person {
  return PEOPLE[id];
}

export function getPartner(id: UserId): Person {
  return PEOPLE[id === "adriel" ? "maria" : "adriel"];
}

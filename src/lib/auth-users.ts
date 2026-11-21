import { readJsonFile, writeJsonFile } from "@/lib/io";
import type { PublicUser, UserRecord, UserRole } from "@/lib/types";

export function toPublicUser(r: UserRecord): PublicUser {
  return {
    id: r.id,
    nickname: r.nickname,
    role: r.role,
    email: r.email ?? null,
    phone: r.phone ?? null,
    username: r.username ?? null,
    merchantProfile: r.merchantProfile,
  };
}

export async function loadUserRecords(): Promise<UserRecord[]> {
  return readJsonFile<UserRecord[]>("users.json");
}

export async function saveUserRecords(users: UserRecord[]): Promise<void> {
  await writeJsonFile("users.json", users);
}

export function findUserByLogin(login: string, users: UserRecord[]): UserRecord | undefined {
  const t = login.trim();
  if (!t) return undefined;
  const lower = t.toLowerCase();
  return users.find(
    (u) =>
      (u.email && u.email.toLowerCase() === lower) ||
      (u.phone && u.phone.replace(/\s+/g, "") === t.replace(/\s+/g, "")) ||
      (u.username && u.username === t),
  );
}

export async function appendUser(record: UserRecord): Promise<void> {
  const users = await loadUserRecords();
  users.push(record);
  await saveUserRecords(users);
}

export function findUserByEmail(email: string, users: UserRecord[]): UserRecord | undefined {
  const lower = email.trim().toLowerCase();
  return users.find((u) => u.email && u.email.toLowerCase() === lower);
}

export function findUserByPhone(phone: string, users: UserRecord[]): UserRecord | undefined {
  const n = phone.replace(/\s+/g, "");
  return users.find((u) => u.phone && u.phone.replace(/\s+/g, "") === n);
}

/** 昵称 Trim 后完全一致视为同一昵称（不可重复注册） */
export function findUserByNickname(
  nickname: string,
  users: UserRecord[],
  excludeUserId?: string,
): UserRecord | undefined {
  const n = nickname.trim();
  if (!n) return undefined;
  return users.find((u) => u.id !== excludeUserId && u.nickname.trim() === n);
}

export function findUserByUsername(username: string, users: UserRecord[]): UserRecord | undefined {
  const t = username.trim();
  return users.find((u) => u.username && u.username === t);
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === "super_admin" || role === "admin" || role === "merchant";
}

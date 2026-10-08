"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createAdminSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");
  if (!username || !password) return { error: "Username and password are required." };

  const user = await db.adminUser.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "Incorrect username or password." };
  }

  await db.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createAdminSession({ id: user.id, username: user.username, role: user.role });
  redirect("/admin");
}

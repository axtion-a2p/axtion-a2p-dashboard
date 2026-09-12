"use server";

import { redirect } from "next/navigation";
import { createAdminSession } from "@/lib/auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return { error: "ADMIN_PASSWORD is not configured on the server." };
  if (password !== expected) return { error: "Incorrect password." };

  await createAdminSession();
  redirect("/admin");
}

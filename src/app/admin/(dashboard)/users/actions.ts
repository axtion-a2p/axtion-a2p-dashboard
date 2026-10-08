"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/auth";
import { hashPassword, generateTempPassword } from "@/lib/password";

export type CreateSubUserState = { error?: string; createdUsername?: string; tempPassword?: string };

export async function createSubUser(_prev: CreateSubUserState, formData: FormData): Promise<CreateSubUserState> {
  await requireSuperAdmin();

  const username = String(formData.get("username") || "").trim();
  const canViewSpend = formData.get("canViewSpend") === "on";
  const subAccountIds = formData.getAll("subAccountIds").map(String).filter(Boolean);

  if (!username) return { error: "Username is required." };
  if (subAccountIds.length === 0) return { error: "Grant access to at least one sub-account." };

  const existing = await db.adminUser.findUnique({ where: { username } });
  if (existing) return { error: "That username is already taken." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await db.adminUser.create({
    data: {
      username,
      passwordHash,
      role: "RESTRICTED",
      canViewSpend,
      accessGrants: { create: subAccountIds.map((subAccountId) => ({ subAccountId })) },
    },
  });

  revalidatePath("/admin/users");
  return { createdUsername: username, tempPassword };
}

export async function deleteSubUser(userId: string) {
  const current = await requireSuperAdmin();
  if (current.id === userId) throw new Error("Cannot delete your own account.");

  const target = await db.adminUser.findUniqueOrThrow({ where: { id: userId } });
  if (target.role === "SUPER_ADMIN") throw new Error("Cannot delete a super admin.");

  await db.adminUser.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
}

export async function updateSubUserAccess(userId: string, formData: FormData) {
  await requireSuperAdmin();
  const canViewSpend = formData.get("canViewSpend") === "on";
  const subAccountIds = formData.getAll("subAccountIds").map(String).filter(Boolean);

  await db.$transaction([
    db.adminUser.update({ where: { id: userId }, data: { canViewSpend } }),
    db.subAccountAccess.deleteMany({ where: { userId } }),
    db.subAccountAccess.createMany({ data: subAccountIds.map((subAccountId) => ({ userId, subAccountId })) }),
  ]);

  revalidatePath("/admin/users");
}

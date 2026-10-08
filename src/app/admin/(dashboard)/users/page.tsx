import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { BrandKicker } from "@/components/Brand";
import { getCurrentAdminUser } from "@/lib/auth";
import { CreateUserForm } from "./CreateUserForm";
import { deleteSubUser, updateSubUserAccess } from "./actions";

export default async function UsersPage() {
  const user = await getCurrentAdminUser();
  if (!user) return null; // layout redirects unauthenticated requests
  if (user.role !== "SUPER_ADMIN") redirect("/admin");

  const [users, accounts] = await Promise.all([
    db.adminUser.findMany({
      orderBy: { createdAt: "asc" },
      include: { accessGrants: { include: { subAccount: { select: { id: true, businessName: true } } } } },
    }),
    db.subAccount.findMany({ where: { provider: "TWILIO" }, select: { id: true, businessName: true }, orderBy: { businessName: "asc" } }),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <BrandKicker />
          <h1 className="text-2xl font-semibold text-neutral-900">Manage users</h1>
        </div>
        <Link href="/admin/delivery-report" className="text-sm font-medium text-primary underline">
          ← Delivery report
        </Link>
      </div>

      <section className="mb-10 space-y-3">
        <h2 className="text-lg font-semibold text-neutral-900">Existing users</h2>
        {users.map((u) => (
          <div key={u.id} className="rounded-xl border border-neutral-200 p-4">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <span className="font-medium text-neutral-900">{u.username}</span>{" "}
                <span className="text-xs uppercase text-neutral-400">{u.role}</span>
              </div>
              {u.role !== "SUPER_ADMIN" && u.id !== user.id && (
                <form action={async () => { "use server"; await deleteSubUser(u.id); }}>
                  <button className="text-sm text-red-600 hover:underline">Remove</button>
                </form>
              )}
            </div>

            {u.role === "SUPER_ADMIN" ? (
              <p className="text-sm text-neutral-500">Full access — all sub-accounts, always sees spend.</p>
            ) : (
              <form
                action={async (formData: FormData) => {
                  "use server";
                  await updateSubUserAccess(u.id, formData);
                }}
                className="space-y-3"
              >
                <div className="flex flex-wrap gap-3">
                  {accounts.map((a) => (
                    <label key={a.id} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        name="subAccountIds"
                        value={a.id}
                        defaultChecked={u.accessGrants.some((g) => g.subAccount.id === a.id)}
                      />
                      {a.businessName}
                    </label>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="canViewSpend" defaultChecked={u.canViewSpend} />
                  Can view spend/cost figures
                </label>
                <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  Save access
                </button>
              </form>
            )}
          </div>
        ))}
      </section>

      <CreateUserForm accounts={accounts} />
    </main>
  );
}

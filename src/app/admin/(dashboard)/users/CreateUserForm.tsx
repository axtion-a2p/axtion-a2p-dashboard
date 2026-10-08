"use client";

import { useActionState } from "react";
import { createSubUser, type CreateSubUserState } from "./actions";

const initialState: CreateSubUserState = {};

export function CreateUserForm({ accounts }: { accounts: { id: string; businessName: string }[] }) {
  const [state, formAction, pending] = useActionState(createSubUser, initialState);

  return (
    <div className="rounded-xl border border-neutral-200 p-6">
      <h3 className="mb-4 font-medium text-neutral-900">Create a sub-user</h3>

      {state.tempPassword && (
        <div className="mb-4 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-medium">
            Created <strong>{state.createdUsername}</strong>. Share this temporary password now — it will not be shown again:
          </p>
          <p className="mt-2 rounded bg-white px-3 py-2 font-mono text-base">{state.tempPassword}</p>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Username</label>
          <input
            type="text"
            name="username"
            required
            autoComplete="off"
            className="w-full max-w-sm rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Sub-account access</label>
          <div className="max-h-48 max-w-sm space-y-1 overflow-y-auto rounded-md border border-neutral-200 p-3">
            {accounts.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="subAccountIds" value={a.id} />
                {a.businessName}
              </label>
            ))}
            {accounts.length === 0 && <p className="text-sm text-neutral-400">No sub-accounts yet.</p>}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="canViewSpend" />
          Can view spend/cost figures
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create sub-user"}
        </button>
      </form>
    </div>
  );
}

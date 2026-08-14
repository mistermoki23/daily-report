"use client";

import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        403
      </p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">Access Denied</h1>
      <p className="mt-2 text-sm text-slate-600">
        У вашей роли нет доступа к этому разделу.
      </p>
      <Link
        href="/dashboard"
        className="mt-4 inline-block text-sm text-slate-700 underline hover:text-slate-900"
      >
        Вернуться на Dashboard
      </Link>
    </div>
  );
}

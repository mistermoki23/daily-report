import { AccessManager } from "./AccessManager";

export default function AdminAccessPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Access</h1>
        <p className="text-sm text-slate-500">
          Assign campaign reports to users (server-enforced ReportAccess)
        </p>
      </div>
      <AccessManager />
    </div>
  );
}

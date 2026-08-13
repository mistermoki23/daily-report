import { listDeletedCampaigns } from "@/lib/campaigns/manage";
import { DeletedCampaignsTable } from "@/components/admin/DeletedCampaignsTable";

export const dynamic = "force-dynamic";

export default async function AdminDeletedCampaignsPage() {
  const campaigns = await listDeletedCampaigns();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Deleted campaigns</h1>
        <p className="text-sm text-slate-500">
          Soft-deleted campaigns. Restore returns them to the dashboard.
        </p>
      </div>
      <DeletedCampaignsTable initial={campaigns} />
    </div>
  );
}

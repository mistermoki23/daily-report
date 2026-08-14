import { redirectIfCannotWrite } from "@/lib/auth/page-guards";

export default async function NewCampaignLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfCannotWrite("/access-denied");
  return children;
}

import { redirectIfCannotAccessDailyUpdate } from "@/lib/auth/page-guards";

export default async function DailyUpdateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfCannotAccessDailyUpdate();
  return children;
}

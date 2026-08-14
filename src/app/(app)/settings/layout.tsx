import { redirectIfCannotAccessSettings } from "@/lib/auth/page-guards";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await redirectIfCannotAccessSettings();
  return children;
}

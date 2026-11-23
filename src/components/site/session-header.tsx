import { connection } from "next/server";
import { SiteHeader } from "@/components/site/site-header";
import { getCurrentUser } from "@/lib/auth";

export async function SessionHeader() {
  await connection();
  const user = await getCurrentUser();

  return <SiteHeader authenticated={Boolean(user?.id)} />;
}

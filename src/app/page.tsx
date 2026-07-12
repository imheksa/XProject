import Dashboard from "@/components/Dashboard";
import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const userId = await getCurrentUserId();
  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, username: true, name: true, profileImageUrl: true },
      })
    : null;

  return <Dashboard initialMe={user} />;
}

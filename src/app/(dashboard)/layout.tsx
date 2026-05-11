import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/nav/sidebar";
import { TopBar } from "@/components/nav/top-bar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar orgName={session.user.orgName} userEmail={session.user.email} />
        <main className="flex-1 p-6 pb-20">{children}</main>
      </div>
    </div>
  );
}

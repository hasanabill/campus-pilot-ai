import { auth } from "@/lib/auth";
import AppShellClient from "@/components/layout/AppShellClient";

export default async function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <AppShellClient
      user={
        session?.user
          ? {
              id: session.user.id,
              name: session.user.name ?? "User",
              email: session.user.email ?? null,
              role: session.user.role,
            }
          : null
      }
    >
      {children}
    </AppShellClient>
  );
}

import { redirect } from "next/navigation";

import RegisterFormClient from "@/components/auth/RegisterFormClient";
import { auth } from "@/lib/auth";

export default async function RegisterPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return <RegisterFormClient />;
}

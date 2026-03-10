import "next-auth";
import "next-auth/jwt";

type AppRole = "student" | "faculty" | "admin" | "registrar";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: AppRole;
      department_id: string | null;
      name?: string | null;
      email?: string | null;
    };
  }

  interface User {
    id: string;
    role: AppRole;
    department_id: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppRole;
    department_id?: string | null;
  }
}

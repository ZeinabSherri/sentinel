import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import { users, orgs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { authConfig } from "@/lib/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const user = await db
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            orgId: users.orgId,
            role: users.role,
          })
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user[0]) return null;

        const org = await db
          .select({ id: orgs.id, name: orgs.name, plan: orgs.plan })
          .from(orgs)
          .where(eq(orgs.id, user[0].orgId))
          .limit(1);

        return {
          id: user[0].id,
          email: user[0].email,
          name: user[0].name ?? user[0].email,
          orgId: user[0].orgId,
          orgName: org[0]?.name ?? "Unknown Org",
          role: user[0].role,
        };
      },
    }),
  ],
});

declare module "next-auth" {
  interface User {
    orgId: string;
    orgName: string;
    role: string;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      orgId: string;
      orgName: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    orgId: string;
    orgName: string;
    role: string;
  }
}

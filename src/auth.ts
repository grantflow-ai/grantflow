import NextAuth, { DefaultSession } from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { getDatabaseClient } from "db/connection";
import { accounts, sessions, users, verificationTokens } from "db/schema";
import { User } from "@/types/database-types";
import { eq } from "drizzle-orm";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { EmailConfig } from "next-auth/providers";

declare module "next-auth" {
	/**
	 * Returned by `auth`, `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
	 */
	interface Session {
		user: User & DefaultSession["user"];
	}
}

export const { handlers, signIn, signOut, auth } = NextAuth({
	adapter: DrizzleAdapter(getDatabaseClient(), {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens,
	}),
	session: { strategy: "jwt" },
	callbacks: {
		session: async ({ session }) => {
			const db = getDatabaseClient();
			const user = await db.query.users.findFirst({
				where: eq(users.email, session.user.email),
			});

			session.user = { ...user, ...session.user };
			return session;
		},
	},
	providers: [
		Google,
		Resend({
			from: "no-reply@grantflow.ai",
			sendVerificationRequest,
		}),
	],
});

async function sendVerificationRequest({
	provider: { apiKey, from },
	identifier: to,
	url,
}: {
	identifier: string;
	url: string;
	expires: Date;
	provider: EmailConfig;
	token: string;
	theme: {
		colorScheme?: "auto" | "dark" | "light";
		logo?: string;
		brandColor?: string;
		buttonText?: string;
	};
	request: Request;
}) {
	const res = await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to,
			subject: "Sign in to GrantFlow.AI",
			text: "Sign in to GrantFlow.AI: ${url}",
			html: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign in to GrantFlow.AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: hsl(222.2, 84%, 4.9%);">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
            <td align="center" style="padding: 40px 0;">
                <table role="presentation" width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: hsl(222.2, 84%, 4.9%); border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <h1 style="margin: 0 0 20px 0; font-family: Arial, sans-serif; font-size: 28px; line-height: 36px; color: hsl(210, 40%, 98%); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);">
                                Sign in to <strong>GrantFlow.AI</strong>
                            </h1>
                            <p style="margin: 0 0 30px 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 24px; color: hsl(215, 20.2%, 65.1%);">
                                Click the button below to securely sign in to your account.
                            </p>
                            <a href="${url}" target="_blank" style="background-color: hsl(210, 40%, 98%); border: none; border-radius: 8px; color: hsl(222.2, 47.4%, 11.2%); padding: 12px 24px; text-decoration: none; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; display: inline-block; transition: background-color 0.3s;">
                                Sign in
                            </a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px; text-align: center; color: hsl(215, 20.2%, 65.1%); font-family: Arial, sans-serif; font-size: 14px; line-height: 20px;">
                            <p style="margin: 0;">If you did not request this email, you can safely ignore it.</p>
                            <p style="margin: 20px 0 0 0;">© 2024 GrantFlow.AI. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `,
		}),
	});

	if (!res.ok) {
		throw new Error(`Resend error: ${JSON.stringify(await res.json())}`);
	}
}

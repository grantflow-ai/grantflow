import { z } from "zod";

export const waitlistSchema = z.object({
	email: z.email({ message: "Please enter a valid email address" }),
	name: z.string().min(2, "Name must be at least 2 characters long"),
});

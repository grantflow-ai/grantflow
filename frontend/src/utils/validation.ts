import { z } from "zod";

const urlSchema = z.string().url();

export const isValidUrl = (url: string): boolean => {
	const result = urlSchema.safeParse(url);
	return result.success;
};

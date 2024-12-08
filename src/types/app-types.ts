import { ApplicationFile } from "@/types/api-types";

export type FormFile = File | ApplicationFile;
export type OmitId<T> = T extends (infer U)[]
	? OmitId<U>[]
	: T extends Record<string, unknown>
		? { [K in keyof Omit<T, "id">]: OmitId<T[K]> }
		: T;

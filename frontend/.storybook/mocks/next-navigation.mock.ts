import { fn } from "@storybook/test";

export interface ReadonlyURLSearchParams {
	get: (name: string) => null | string;
	getAll: (name: string) => string[];
	has: (name: string) => boolean;
	toString: () => string;
}

export const useRouter = () => ({
	back: fn(),
	forward: fn(),
	prefetch: fn(),
	push: fn(),
	refresh: fn(),
	replace: fn(),
});

export const usePathname = () => "/";

export const useSearchParams = (): ReadonlyURLSearchParams => ({
	get: fn(() => null),
	getAll: fn(() => []),
	has: fn(() => false),
	toString: fn(() => ""),
});

export const useParams = () => ({});

export const redirect = fn();

export const notFound = fn();

export interface ReadonlyURLSearchParams {
	get: (name: string) => null | string;
	getAll: (name: string) => string[];
	has: (name: string) => boolean;
	toString: () => string;
}

export const useRouter = () => ({
	back: () => undefined,
	forward: () => undefined,
	prefetch: () => undefined,
	push: () => undefined,
	refresh: () => undefined,
	replace: () => undefined,
});

export const usePathname = () => "/";

export const useSearchParams = (): ReadonlyURLSearchParams => ({
	get: () => null,
	getAll: () => [],
	has: () => false,
	toString: () => "",
});

export const useParams = () => ({});

export const redirect = () => undefined;

export const notFound = () => undefined;

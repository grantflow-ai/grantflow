import { createApplicationSlug, createProjectSlug, extractIdFromSlug } from "./navigation";

interface SlugMapping {
	id: string;
	name: string;
	slug: string;
}

class SlugStore {
	private applicationSlugs = new Map<string, SlugMapping>();
	private projectSlugs = new Map<string, SlugMapping>();
	private slugToIdMap = new Map<string, string>();

	constructor() {
		if (typeof globalThis.window !== "undefined") {
			this.loadFromStorage();
		}
	}

	clearAll(): void {
		this.projectSlugs.clear();
		this.applicationSlugs.clear();
		this.slugToIdMap.clear();
		if (typeof globalThis.window !== "undefined") {
			localStorage.removeItem("grantflow-slugs");
		}
	}

	getApplicationSlug(id: string): null | string {
		return this.applicationSlugs.get(id)?.slug ?? null;
	}

	getIdFromSlug(slug: string): null | string {
		const cachedId = this.slugToIdMap.get(slug);
		if (cachedId) {
			return cachedId;
		}

		const extractedId = extractIdFromSlug(slug);
		return extractedId;
	}

	getProjectSlug(id: string): null | string {
		return this.projectSlugs.get(id)?.slug ?? null;
	}

	registerApplication(id: string, title: string): string {
		const existing = this.applicationSlugs.get(id);
		if (existing && existing.name === title) {
			return existing.slug;
		}

		const slug = createApplicationSlug(title, id);
		this.applicationSlugs.set(id, { id, name: title, slug });
		this.slugToIdMap.set(slug, id);
		this.saveToStorage();
		return slug;
	}

	registerProject(id: string, name: string): string {
		const existing = this.projectSlugs.get(id);
		if (existing && existing.name === name) {
			return existing.slug;
		}

		const slug = createProjectSlug(name, id);
		this.projectSlugs.set(id, { id, name, slug });
		this.slugToIdMap.set(slug, id);
		this.saveToStorage();
		return slug;
	}

	private loadFromStorage(): void {
		try {
			const stored = localStorage.getItem("grantflow-slugs");
			if (stored) {
				const data = JSON.parse(stored) as {
					applications?: [string, SlugMapping][];
					projects?: [string, SlugMapping][];
				};
				this.projectSlugs = new Map(data.projects ?? []);
				this.applicationSlugs = new Map(data.applications ?? []);
				this.rebuildSlugToIdMap();
			}
		} catch {
			// Failed to load slug mappings
		}
	}

	private rebuildSlugToIdMap(): void {
		this.slugToIdMap.clear();
		this.projectSlugs.forEach((mapping) => {
			this.slugToIdMap.set(mapping.slug, mapping.id);
		});
		this.applicationSlugs.forEach((mapping) => {
			this.slugToIdMap.set(mapping.slug, mapping.id);
		});
	}

	private saveToStorage(): void {
		try {
			const data = {
				applications: [...this.applicationSlugs.entries()],
				projects: [...this.projectSlugs.entries()],
			};
			localStorage.setItem("grantflow-slugs", JSON.stringify(data));
		} catch {
			// Failed to save slug mappings
		}
	}
}

export const slugStore = new SlugStore();

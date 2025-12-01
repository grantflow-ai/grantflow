type Mutable<T> = {
	-readonly [P in keyof T]: T[P];
};

export const drop = <T extends object, K extends keyof T>(value: T, ...keys: K[]): Omit<T, K> => {
	const cloned: Mutable<T> = { ...(value as Mutable<T>) };

	for (const key of keys) {
		if (key in cloned) {
			// eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- safe utility deletion
			delete cloned[key];
		}
	}

	return cloned as Omit<T, K>;
};

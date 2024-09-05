export class Ref<T> {
	value: T | null;

	constructor(value: T | null = null) {
		this.value = value;
	}
}

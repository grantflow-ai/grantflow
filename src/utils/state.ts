export class Ref<T> {
	value: null | T;

	constructor(value: null | T = null) {
		this.value = value;
	}
}

export class NotAuthenticatedError extends Error {
	constructor(message = 'User is not authenticated') {
		super(message);
		this.name = 'NotAuthenticatedError';

		// Maintains proper stack trace for where error was thrown
		Object.setPrototypeOf(this, NotAuthenticatedError.prototype);
	}
}
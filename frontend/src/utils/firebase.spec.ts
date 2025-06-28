import { initializeApp } from "firebase/app";
import { browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";
import { getEnv } from "./env";

vi.mock("firebase/app", () => ({
	initializeApp: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
	browserSessionPersistence: "session",
	getAuth: vi.fn(),
	setPersistence: vi.fn(),
}));

vi.mock("./env", () => ({
	getEnv: vi.fn(),
}));

describe("Firebase Utilities", () => {
	const mockFirebaseApp = { name: "test-app", options: {} };
	const mockAuth = { config: {}, currentUser: null };

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(initializeApp).mockReturnValue(mockFirebaseApp as any);
		vi.mocked(getAuth).mockReturnValue(mockAuth as any);
		vi.mocked(setPersistence).mockResolvedValue();

		vi.mocked(getEnv).mockReturnValue({
			NEXT_PUBLIC_FIREBASE_API_KEY: "AIzaSyD9x8j2kLm5nR7cM3pQ4vN2zXy",
			NEXT_PUBLIC_FIREBASE_APP_ID: "1:847362514908:web:a7b9c8d6e5f4a3b2c1d0",
			NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "acmetech-dev.firebaseapp.com",
			NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-XYZ123ABC4",
			NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "847362514908",
			NEXT_PUBLIC_FIREBASE_PROJECT_ID: "acmetech-dev",
			NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "acmetech-dev.appspot.com",
		} as any);

		vi.resetModules();
	});

	describe("getFirebaseApp", () => {
		it("should initialize Firebase app with correct configuration", async () => {
			const { getFirebaseApp } = await import("./firebase");

			const app = getFirebaseApp();

			expect(initializeApp).toHaveBeenCalledWith({
				apiKey: "AIzaSyD9x8j2kLm5nR7cM3pQ4vN2zXy",
				appId: "1:847362514908:web:a7b9c8d6e5f4a3b2c1d0",
				authDomain: "acmetech-dev.firebaseapp.com",
				measurementId: "G-XYZ123ABC4",
				messagingSenderId: "847362514908",
				projectId: "acmetech-dev",
				storageBucket: "acmetech-dev.appspot.com",
			});
			expect(app).toBe(mockFirebaseApp);
		});

		it("should return cached app on subsequent calls", async () => {
			const { getFirebaseApp } = await import("./firebase");

			const app1 = getFirebaseApp();
			const app2 = getFirebaseApp();

			expect(initializeApp).toHaveBeenCalledTimes(1);
			expect(app1).toBe(app2);
			expect(app1).toBe(mockFirebaseApp);
		});

		it("should use environment variables for configuration", async () => {
			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_FIREBASE_API_KEY: "custom-api-key",
				NEXT_PUBLIC_FIREBASE_APP_ID: "custom-app-id",
				NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "custom-auth-domain",
				NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "custom-measurement-id",
				NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "custom-sender-id",
				NEXT_PUBLIC_FIREBASE_PROJECT_ID: "custom-project-id",
				NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "custom-storage-bucket",
			} as any);

			const { getFirebaseApp } = await import("./firebase");

			getFirebaseApp();

			expect(initializeApp).toHaveBeenCalledWith({
				apiKey: "custom-api-key",
				appId: "custom-app-id",
				authDomain: "custom-auth-domain",
				measurementId: "custom-measurement-id",
				messagingSenderId: "custom-sender-id",
				projectId: "custom-project-id",
				storageBucket: "custom-storage-bucket",
			});
		});

		it("should handle initialization errors", async () => {
			vi.mocked(initializeApp).mockImplementation(() => {
				throw new Error("Firebase initialization failed");
			});

			const { getFirebaseApp } = await import("./firebase");

			expect(() => getFirebaseApp()).toThrow("Firebase initialization failed");
		});

		it("should handle empty environment variables", async () => {
			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_FIREBASE_API_KEY: "",
				NEXT_PUBLIC_FIREBASE_APP_ID: "",
				NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "",
				NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "",
				NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "",
				NEXT_PUBLIC_FIREBASE_PROJECT_ID: "",
				NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "",
			} as any);

			const { getFirebaseApp } = await import("./firebase");

			getFirebaseApp();

			expect(initializeApp).toHaveBeenCalledWith({
				apiKey: "",
				appId: "",
				authDomain: "",
				measurementId: "",
				messagingSenderId: "",
				projectId: "",
				storageBucket: "",
			});
		});
	});

	describe("getFirebaseAuth", () => {
		it("should initialize auth with firebase app", async () => {
			const { getFirebaseAuth } = await import("./firebase");

			const authInstance = getFirebaseAuth();

			expect(getAuth).toHaveBeenCalledWith(mockFirebaseApp);
			expect(setPersistence).toHaveBeenCalledWith(mockAuth, "session");
			expect(authInstance).toBe(mockAuth);
		});

		it("should return cached auth on subsequent calls", async () => {
			const { getFirebaseAuth } = await import("./firebase");

			const auth1 = getFirebaseAuth();
			const auth2 = getFirebaseAuth();

			expect(getAuth).toHaveBeenCalledTimes(1);
			expect(setPersistence).toHaveBeenCalledTimes(1);
			expect(auth1).toBe(auth2);
			expect(auth1).toBe(mockAuth);
		});

		it("should use session persistence", async () => {
			const { getFirebaseAuth } = await import("./firebase");

			getFirebaseAuth();

			expect(setPersistence).toHaveBeenCalledWith(mockAuth, browserSessionPersistence);
		});

		it("should handle getAuth errors", async () => {
			vi.mocked(getAuth).mockImplementation(() => {
				throw new Error("Auth initialization failed");
			});

			const { getFirebaseAuth } = await import("./firebase");

			expect(() => getFirebaseAuth()).toThrow("Auth initialization failed");
		});

		it("should handle setPersistence errors gracefully", async () => {
			vi.mocked(setPersistence).mockRejectedValue(new Error("Persistence failed"));

			const { getFirebaseAuth } = await import("./firebase");

			expect(() => getFirebaseAuth()).not.toThrow();
			expect(setPersistence).toHaveBeenCalled();
		});
	});

	describe("Integration behavior", () => {
		it("should initialize both app and auth correctly", async () => {
			const { getFirebaseApp, getFirebaseAuth } = await import("./firebase");

			const app = getFirebaseApp();
			const authInstance = getFirebaseAuth();

			expect(initializeApp).toHaveBeenCalledWith({
				apiKey: "AIzaSyD9x8j2kLm5nR7cM3pQ4vN2zXy",
				appId: "1:847362514908:web:a7b9c8d6e5f4a3b2c1d0",
				authDomain: "acmetech-dev.firebaseapp.com",
				measurementId: "G-XYZ123ABC4",
				messagingSenderId: "847362514908",
				projectId: "acmetech-dev",
				storageBucket: "acmetech-dev.appspot.com",
			});
			expect(getAuth).toHaveBeenCalledWith(mockFirebaseApp);
			expect(setPersistence).toHaveBeenCalledWith(mockAuth, "session");
			expect(app).toBe(mockFirebaseApp);
			expect(authInstance).toBe(mockAuth);
		});

		it("should reuse app instance when getting auth", async () => {
			const { getFirebaseApp, getFirebaseAuth } = await import("./firebase");

			const app = getFirebaseApp();

			const authInstance = getFirebaseAuth();

			expect(initializeApp).toHaveBeenCalledTimes(1);
			expect(getAuth).toHaveBeenCalledWith(app);
			expect(authInstance).toBe(mockAuth);
		});

		it("should handle auth initialization before app", async () => {
			const { getFirebaseAuth } = await import("./firebase");

			const authInstance = getFirebaseAuth();

			expect(initializeApp).toHaveBeenCalledTimes(1);
			expect(getAuth).toHaveBeenCalledWith(mockFirebaseApp);
			expect(authInstance).toBe(mockAuth);
		});
	});

	describe("Configuration edge cases", () => {
		it("should handle configuration with special characters", async () => {
			vi.mocked(getEnv).mockReturnValue({
				NEXT_PUBLIC_FIREBASE_API_KEY: "test-api-key_with-special.chars",
				NEXT_PUBLIC_FIREBASE_APP_ID: "1:123456789012:web:abcdef123456",
				NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test-project.firebaseapp.com",
				NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: "G-MEASUREMENT123",
				NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID: "123456789012",
				NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project-123",
				NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test-project-123.appspot.com",
			} as any);

			const { getFirebaseApp } = await import("./firebase");

			getFirebaseApp();

			expect(initializeApp).toHaveBeenCalledWith({
				apiKey: "test-api-key_with-special.chars",
				appId: "1:123456789012:web:abcdef123456",
				authDomain: "test-project.firebaseapp.com",
				measurementId: "G-MEASUREMENT123",
				messagingSenderId: "123456789012",
				projectId: "test-project-123",
				storageBucket: "test-project-123.appspot.com",
			});
		});

		it("should handle persistence setup async", async () => {
			let persistenceResolve: () => void;
			const persistencePromise = new Promise<void>((resolve) => {
				persistenceResolve = resolve;
			});
			vi.mocked(setPersistence).mockReturnValue(persistencePromise);

			const { getFirebaseAuth } = await import("./firebase");

			const authInstance = getFirebaseAuth();

			expect(authInstance).toBe(mockAuth);
			expect(setPersistence).toHaveBeenCalled();

			persistenceResolve!();
			await persistencePromise;
		});
	});

	describe("Singleton pattern", () => {
		it("should maintain singleton across different access patterns", async () => {
			const { getFirebaseApp, getFirebaseAuth } = await import("./firebase");

			const app1 = getFirebaseApp();
			const auth1 = getFirebaseAuth();
			const app2 = getFirebaseApp();
			const auth2 = getFirebaseAuth();

			expect(app1).toBe(app2);
			expect(auth1).toBe(auth2);
			expect(initializeApp).toHaveBeenCalledTimes(1);
			expect(getAuth).toHaveBeenCalledTimes(1);
			expect(setPersistence).toHaveBeenCalledTimes(1);
		});
	});
});
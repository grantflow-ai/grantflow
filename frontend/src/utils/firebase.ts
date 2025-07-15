"use client";

import { type FirebaseApp, initializeApp } from "firebase/app";
import { type Auth, browserSessionPersistence, getAuth, setPersistence, type User } from "firebase/auth";

import type { UserInfo } from "@/types/user";
import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

const instanceRef: { app: FirebaseApp | null; auth: Auth | null } = {
	app: null,
	auth: null,
};

/**
 * Converts a Firebase User object to our UserInfo type
 */
export function convertFirebaseUser(user: User): UserInfo {
	return {
		customClaims: null, // Not available on client-side User object
		disabled: false, // Firebase Auth User doesn't have this property on client
		displayName: user.displayName,
		email: user.email,
		emailVerified: user.emailVerified,
		phoneNumber: user.phoneNumber,
		photoURL: user.photoURL,
		providerData: user.providerData.map((provider) => ({
			displayName: provider.displayName,
			email: provider.email,
			phoneNumber: provider.phoneNumber,
			photoURL: provider.photoURL,
			providerId: provider.providerId,
			uid: provider.uid,
		})),
		tenantId: user.tenantId ?? null,
		uid: user.uid,
	};
}

/**
 * Creates a minimal UserInfo object for simple cases
 * Useful when you need to create a UserInfo from partial data
 */
export function createUserInfo(data: {
	displayName?: null | string;
	email?: null | string;
	emailVerified?: boolean;
	phoneNumber?: null | string;
	photoURL?: null | string;
	providerId?: string;
	uid: string;
}): UserInfo {
	const {
		displayName = null,
		email = null,
		emailVerified = false,
		phoneNumber = null,
		photoURL = null,
		providerId = "firebase",
		uid,
	} = data;

	return {
		customClaims: null,
		disabled: false,
		displayName,
		email,
		emailVerified,
		phoneNumber,
		photoURL,
		providerData: providerId
			? [
					{
						displayName,
						email,
						phoneNumber,
						photoURL,
						providerId,
						uid,
					},
				]
			: [],
		tenantId: null,
		uid,
	};
}

export function getFirebaseApp(): FirebaseApp {
	if (!instanceRef.app) {
		const env = getEnv();
		log.info("Initializing Firebase app", {
			apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ? "***" : "missing",
			authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
			projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
		});

		instanceRef.app = initializeApp({
			apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
			appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
			authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
			measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
			messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGE_SENDER_ID,
			projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
			storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
		});
	}

	return instanceRef.app;
}

export function getFirebaseAuth(): Auth {
	if (!instanceRef.auth) {
		log.info("Initializing Firebase Auth");
		const app = getFirebaseApp();
		const auth = getAuth(app);
		void setPersistence(auth, browserSessionPersistence);

		instanceRef.auth = auth;
	}

	return instanceRef.auth;
}

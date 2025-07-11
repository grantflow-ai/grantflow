"use client";

import { type FirebaseApp, initializeApp } from "firebase/app";
import { type Auth, browserSessionPersistence, getAuth, setPersistence } from "firebase/auth";

import { getEnv } from "@/utils/env";
import { log } from "@/utils/logger";

const instanceRef: { app: FirebaseApp | null; auth: Auth | null } = {
	app: null,
	auth: null,
};

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

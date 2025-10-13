"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useUserStore } from "@/stores/user-store";
import { convertFirebaseUser, getFirebaseAuth } from "@/utils/firebase";
import { log } from "@/utils/logger/client";

interface AuthProviderProps {
	children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [isLoading, setIsLoading] = useState(true);
	const { setUser } = useUserStore();

	useEffect(() => {
		const auth = getFirebaseAuth();
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			if (user) {
				log.info("User logged in via Firebase auth", {
					component: "AuthProvider",
					uid: user.uid,
				});
				const userInfo = convertFirebaseUser(user);
				setUser(userInfo);
			} else {
				log.info("User logged out");
				setUser(null);
			}
			setIsLoading(false);
		});
		return () => {
			unsubscribe();
		};
	}, [setUser]);

	if (isLoading) {
		return null;
	}
	return <>{children}</>;
}

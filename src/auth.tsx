import { createContext, ReactNode, useContext } from "react";
import { UserInfo } from "@firebase/auth";

export const AuthContext = createContext<{
	user: UserInfo | null;
}>({
	user: null,
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ user, children }: { user: UserInfo | null; children: ReactNode }) {
	return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}

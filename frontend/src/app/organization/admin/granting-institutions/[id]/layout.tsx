import type { ReactNode } from "react";

interface GrantingInstitutionDetailLayoutProps {
	children: ReactNode;
}

export default function GrantingInstitutionDetailLayout({ children }: GrantingInstitutionDetailLayoutProps) {
	return <div className="fixed inset-0 bg-white">{children}</div>;
}

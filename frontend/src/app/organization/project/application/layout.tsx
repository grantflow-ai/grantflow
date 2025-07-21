import SharedLayout from "@/components/layout/shared-layout";

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
	return <SharedLayout>{children}</SharedLayout>;
}

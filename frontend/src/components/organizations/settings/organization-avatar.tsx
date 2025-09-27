import Image from "next/image";
import { generateInitials } from "@/utils/user";

const AVATAR_COLORS = ["FFECEC", "#FFDDE1", "#D6EAF8", "#D5F5E3", "#FCF3CF", "#E8DAEF", "#D0ECE7", "#FDEBD0"];

const hashCode = (str: string) => {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		const char = str.codePointAt(i) ?? 0;
		hash = (hash << 5) - hash + char;
		hash &= hash;
	}
	return Math.abs(hash);
};

interface OrganizationAvatarProps {
	className?: string;
	logoUrl?: null | string;
	organizationId: string;
	organizationName: string;
}

export function OrganizationAvatar({ className, logoUrl, organizationId, organizationName }: OrganizationAvatarProps) {
	const initials = generateInitials(organizationName, organizationId);
	const colorIndex = hashCode(organizationId) % AVATAR_COLORS.length;
	const colorClass = AVATAR_COLORS[colorIndex];

	return (
		<div
			className={`flex items-center justify-center relative overflow-hidden ${className}`}
			data-test="organization-avatar"
			style={{ backgroundColor: logoUrl ? "transparent" : colorClass }}
		>
			{logoUrl ? (
				<Image alt={`${organizationName} logo`} className="object-cover" fill src={logoUrl} />
			) : (
				<span className="font-medium text-app-black font-cabin leading-[30px] text-2xl">{initials}</span>
			)}
		</div>
	);
}

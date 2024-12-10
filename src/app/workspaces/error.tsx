"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PagePath } from "@/enums";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	const router = useRouter();
	useEffect(() => {
		console.error(error);
		if (Reflect.get(error, "name") === "NotAuthenticatedError") {
			router.push(PagePath.SIGNIN);
		}
	}, [error]);

	if (Reflect.get(error, "name") === "NotAuthenticatedError") {
		return <div>Redirecting...</div>;
	}

	return (
		<div>
			<h2>Something went wrong!</h2>
			<button
				onClick={() => {
					reset();
				}}
			>
				Try again
			</button>
		</div>
	);
}

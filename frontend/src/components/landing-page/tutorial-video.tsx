"use client";

export function TutorialVideo() {
	return (
		<video autoPlay className="h-auto max-w-full shadow-lg" controls loop muted playsInline>
			<source media="(min-width: 1280px)" src="/assets/tutorial-1080p.mp4" type="video/mp4" />
			<source media="(min-width: 768px)" src="/assets/tutorial-720p.mp4" type="video/mp4" />
			<source src="/assets/tutorial-480p.mp4" type="video/mp4" />
			Your browser does not support the video tag.
		</video>
	);
}

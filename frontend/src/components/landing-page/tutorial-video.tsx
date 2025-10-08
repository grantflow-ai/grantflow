"use client";

export function TutorialVideo() {
	return (
		<>
		<video autoPlay className="h-auto max-w-full shadow-lg" controls loop muted playsInline aria-describedby="tutorial-video-desc">
			<source media="(min-width: 1280px)" src="/assets/tutorial-1080p.mp4" type="video/mp4" />
			<source src="/assets/tutorial-720p.mp4" type="video/mp4" />
			<track kind="captions" src="null" label="No audio" default />
			Your browser does not support the video tag.
		</video>
		<p id="tutorial-video-desc" className="sr-only">
			Short demonstration video showing how to submit a grant application form step by step.
		</p>
		</>
	);
}

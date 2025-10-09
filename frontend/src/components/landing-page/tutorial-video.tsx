"use client";

export function TutorialVideo() {
	return (
		<>
			<video
				aria-describedby="tutorial-video-desc"
				autoPlay
				className="h-auto max-w-full shadow-lg"
				controls
				loop
				muted
				playsInline
			>
				<source media="(min-width: 1280px)" src="/assets/tutorial-1080p.mp4" type="video/mp4" />
				<source src="/assets/tutorial-720p.mp4" type="video/mp4" />
				<track default kind="captions" label="No audio" src="null" />
				Your browser does not support the video tag.
			</video>
			<p className="sr-only" id="tutorial-video-desc">
				Short demonstration video showing how to submit a grant application form step by step.
			</p>
		</>
	);
}

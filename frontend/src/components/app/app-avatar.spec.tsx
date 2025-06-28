import { render, screen } from "@testing-library/react";

import { AppAvatar, AvatarGroup } from "./app-avatar";

describe("AppAvatar", () => {
	it("renders with initials and default size", () => {
		render(<AppAvatar initials="JD" />);

		expect(screen.getByTestId("app-avatar")).toBeInTheDocument();
		expect(screen.getByTestId("app-avatar-fallback")).toHaveTextContent("JD");
		expect(screen.getByTestId("app-avatar")).toHaveClass("h-8", "w-8");
	});

	it("renders with custom size classes", () => {
		render(<AppAvatar initials="JD" size="lg" />);

		expect(screen.getByTestId("app-avatar")).toHaveClass("h-12", "w-12");
	});

	it("renders with small size", () => {
		render(<AppAvatar initials="JD" size="sm" />);

		expect(screen.getByTestId("app-avatar")).toHaveClass("h-6", "w-6");
	});

	it("renders avatar with image URL prop", () => {
		render(<AppAvatar imageUrl="https://example.com/avatar.jpg" initials="JD" />);

		
		const avatar = screen.getByTestId("app-avatar");
		expect(avatar).toBeInTheDocument();

		
		
		expect(screen.getByTestId("app-avatar-fallback")).toHaveTextContent("JD");
	});

	it("shows fallback with initials when no image provided", () => {
		render(<AppAvatar initials="JD" />);

		expect(screen.getByTestId("app-avatar-fallback")).toBeInTheDocument();
		expect(screen.getByTestId("app-avatar-fallback")).toHaveTextContent("JD");
	});

	it("applies custom background color", () => {
		render(<AppAvatar backgroundColor="#ff0000" initials="JD" />);

		const fallback = screen.getByTestId("app-avatar-fallback");
		expect(fallback).toHaveStyle({ backgroundColor: "#ff0000" });
	});

	it("uses default background color when none provided", () => {
		render(<AppAvatar initials="JD" />);

		const fallback = screen.getByTestId("app-avatar-fallback");
		expect(fallback).toHaveStyle({ backgroundColor: "#369e94" });
	});

	it("applies custom className", () => {
		render(<AppAvatar className="custom-class" initials="JD" />);

		expect(screen.getByTestId("app-avatar")).toHaveClass("custom-class");
	});

	it("has correct font styling on fallback", () => {
		render(<AppAvatar initials="JD" />);

		const fallback = screen.getByTestId("app-avatar-fallback");
		expect(fallback).toHaveClass("font-semibold", "not-italic", "text-white");
	});
});

describe("AvatarGroup", () => {
	const mockUsers = [
		{ imageUrl: "https://example.com/jd.jpg", initials: "JD" },
		{ backgroundColor: "#ff0000", initials: "AB" },
		{ initials: "CD" },
		{ initials: "EF" },
		{ initials: "GH" },
		{ initials: "IJ" },
	];

	it("renders group with multiple avatars", () => {
		render(<AvatarGroup users={mockUsers.slice(0, 3)} />);

		expect(screen.getByTestId("avatar-group")).toBeInTheDocument();
		expect(screen.getAllByTestId("app-avatar")).toHaveLength(3);
	});

	it("respects maxVisible limit and shows remaining count", () => {
		render(<AvatarGroup maxVisible={3} users={mockUsers} />);

		const avatars = screen.getAllByTestId("app-avatar");
		expect(avatars).toHaveLength(4); 

		
		const fallbacks = screen.getAllByTestId("app-avatar-fallback");
		const overflowFallback = fallbacks.find((fallback) => fallback.textContent === "+3");
		expect(overflowFallback).toBeInTheDocument();
	});

	it("uses default maxVisible of 4", () => {
		render(<AvatarGroup users={mockUsers} />);

		const avatars = screen.getAllByTestId("app-avatar");
		expect(avatars).toHaveLength(5); 
	});

	it("doesn't show overflow when users count is within limit", () => {
		render(<AvatarGroup maxVisible={4} users={mockUsers.slice(0, 3)} />);

		const avatars = screen.getAllByTestId("app-avatar");
		expect(avatars).toHaveLength(3); 
	});

	it("applies default colors to users without backgroundColor", () => {
		const usersWithoutColors = [{ initials: "AA" }, { initials: "BB" }, { initials: "CC" }, { initials: "DD" }];

		render(<AvatarGroup users={usersWithoutColors} />);

		const fallbacks = screen.getAllByTestId("app-avatar-fallback");

		
		expect(fallbacks[0]).toHaveStyle({ backgroundColor: "#369e94" });
		
		expect(fallbacks[1]).toHaveStyle({ backgroundColor: "#9e366f" });
		
		expect(fallbacks[2]).toHaveStyle({ backgroundColor: "#9747ff" });
		
		expect(fallbacks[3]).toHaveStyle({ backgroundColor: "#5179fc" });
	});

	it("preserves user custom background colors", () => {
		const usersWithColors = [
			{ backgroundColor: "#custom1", initials: "AA" },
			{ backgroundColor: "#custom2", initials: "BB" },
		];

		render(<AvatarGroup users={usersWithColors} />);

		const fallbacks = screen.getAllByTestId("app-avatar-fallback");
		expect(fallbacks[0]).toHaveStyle({ backgroundColor: "#custom1" });
		expect(fallbacks[1]).toHaveStyle({ backgroundColor: "#custom2" });
	});

	it("applies size to all avatars in group", () => {
		render(<AvatarGroup size="lg" users={mockUsers.slice(0, 2)} />);

		const avatars = screen.getAllByTestId("app-avatar");
		avatars.forEach((avatar) => {
			expect(avatar).toHaveClass("h-12", "w-12");
		});
	});

	it("applies custom className to group container", () => {
		render(<AvatarGroup className="custom-group-class" users={mockUsers.slice(0, 2)} />);

		expect(screen.getByTestId("avatar-group")).toHaveClass("custom-group-class");
	});

	it("applies ring styling to avatars", () => {
		render(<AvatarGroup users={mockUsers.slice(0, 2)} />);

		const avatars = screen.getAllByTestId("app-avatar");
		avatars.forEach((avatar) => {
			expect(avatar).toHaveClass("ring-2", "ring-background");
		});
	});

	it("handles empty users array", () => {
		render(<AvatarGroup users={[]} />);

		expect(screen.getByTestId("avatar-group")).toBeInTheDocument();
		expect(screen.queryAllByTestId("app-avatar")).toHaveLength(0);
	});

	it("overflow avatar has correct styling", () => {
		render(<AvatarGroup maxVisible={2} users={mockUsers} />);

		const fallbacks = screen.getAllByTestId("app-avatar-fallback");
		const overflowFallback = fallbacks.find((fallback) => fallback.textContent === "+4");

		expect(overflowFallback).toHaveStyle({ backgroundColor: "#636170" });
	});
});

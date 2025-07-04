// __tests__/DashboardHeader.test.tsx
import { render, screen } from "@testing-library/react";
import { DashboardHeader } from "./dashboard-header";


describe("DashboardHeader", () => {
  it("renders the Notification component", () => {
    render(
      <DashboardHeader
        projectTeamMembers={[
          { backgroundColor: "#369e94", initials: "NH" },
          { backgroundColor: "#9e366f", initials: "VH" },
        ]}
      />
    );
    // Check if notification is present (e.g., find by role or by text if it has any text)
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders the correct number of avatars", () => {
    const members = [
      { backgroundColor: "#369e94", initials: "NH" },
      { backgroundColor: "#9e366f", initials: "VH" },
      { backgroundColor: "#9747ff", initials: "AR" },
    ];
    render(<DashboardHeader projectTeamMembers={members} />);
    // Since AvatarGroup might not render each avatar with text, this is an example:
    members.forEach((member) => {
      expect(screen.getByText(member.initials)).toBeInTheDocument();
    });
  });
});

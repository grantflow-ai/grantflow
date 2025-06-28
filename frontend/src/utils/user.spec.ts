import { UserRole } from "@/types/user";
import { generateInitials, getRoleLabel } from "./user";

describe("User Utilities", () => {
	describe("generateInitials", () => {
		describe("with full name", () => {
			it("should generate initials from first and last name", () => {
				expect(generateInitials("John Doe")).toBe("JD");
				expect(generateInitials("Jane Smith")).toBe("JS");
				expect(generateInitials("Alice Johnson")).toBe("AJ");
			});

			it("should handle multiple middle names", () => {
				expect(generateInitials("John Michael Smith")).toBe("JS");
				expect(generateInitials("Mary Elizabeth Johnson")).toBe("MJ");
				expect(generateInitials("Robert James William Brown")).toBe("RB");
			});

			it("should handle single names by taking first two characters", () => {
				expect(generateInitials("Madonna")).toBe("MA");
				expect(generateInitials("Cher")).toBe("CH");
				expect(generateInitials("X")).toBe("X");
			});

			it("should handle names with extra whitespace", () => {
				expect(generateInitials("  John   Doe  ")).toBe("JD");
				expect(generateInitials("\tJane\t\tSmith\t")).toBe("JA"); 
				expect(generateInitials("\n Alice \n Johnson \n")).toBe("AJ"); 
			});

			it("should handle empty or whitespace-only names", () => {
				expect(generateInitials("")).toBe("??");
				expect(generateInitials("   ")).toBe(""); 
				expect(generateInitials("\t\n")).toBe(""); 
			});

			it("should convert to uppercase", () => {
				expect(generateInitials("john doe")).toBe("JD");
				expect(generateInitials("JANE SMITH")).toBe("JS");
				expect(generateInitials("Alice johnson")).toBe("AJ");
			});

			it("should handle names with special characters", () => {
				expect(generateInitials("Jean-Claude Van Damme")).toBe("JD");
				expect(generateInitials("Mary O'Connor")).toBe("MO");
				expect(generateInitials("José María")).toBe("JM");
			});

			it("should handle very long names", () => {
				expect(generateInitials("Wolfeschlegelsteinhausenbergerdorff Junior")).toBe("WJ");
			});

			it("should handle names with numbers", () => {
				expect(generateInitials("John Doe 3rd")).toBe("J3");
				expect(generateInitials("Robert 2")).toBe("R2");
			});
		});

		describe("with email fallback", () => {
			it("should use email when full name is not provided", () => {
				expect(generateInitials(undefined, "john.doe@example.com")).toBe("JO");
				expect(generateInitials(undefined, "test@domain.com")).toBe("TE");
				expect(generateInitials(undefined, "a@b.co")).toBe("A@");
			});

			it("should prefer full name over email when both provided", () => {
				expect(generateInitials("John Doe", "different@email.com")).toBe("JD");
				expect(generateInitials("Jane Smith", "jane@company.org")).toBe("JS");
			});

			it("should use email when full name is empty", () => {
				expect(generateInitials("", "john@example.com")).toBe("JO");
				expect(generateInitials("   ", "jane@company.org")).toBe(""); 
			});

			it("should handle very short emails", () => {
				expect(generateInitials(undefined, "a")).toBe("A");
				expect(generateInitials(undefined, "")).toBe("??");
			});

			it("should handle email with special characters", () => {
				expect(generateInitials(undefined, "+tag@example.com")).toBe("+T");
				expect(generateInitials(undefined, "user.name@domain.co")).toBe("US");
			});
		});

		describe("fallback behavior", () => {
			it("should return ?? when both name and email are empty", () => {
				expect(generateInitials()).toBe("??");
				expect(generateInitials("", "")).toBe("??");
				expect(generateInitials("   ", "   ")).toBe(""); 
			});

			it("should return ?? when both name and email are null", () => {
				expect(generateInitials(undefined, undefined)).toBe("??");
			});
		});

		describe("edge cases", () => {
			it("should handle names with only spaces between words", () => {
				expect(generateInitials("A B")).toBe("AB");
				expect(generateInitials("X Y Z")).toBe("XZ");
			});

			it("should handle single character names", () => {
				expect(generateInitials("A B")).toBe("AB");
				expect(generateInitials("X")).toBe("X");
			});

			it("should handle names with emojis", () => {
				expect(generateInitials("John 😀 Doe")).toBe("JD");
				expect(generateInitials("😀")).toBe("😀");
			});

			it("should handle names with Unicode characters", () => {
				expect(generateInitials("François Müller")).toBe("FM");
				expect(generateInitials("李 王")).toBe("李王");
			});
		});
	});

	describe("getRoleLabel", () => {
		it("should return correct labels for each role", () => {
			expect(getRoleLabel(UserRole.OWNER)).toBe("Owner");
			expect(getRoleLabel(UserRole.ADMIN)).toBe("Admin");
			expect(getRoleLabel(UserRole.MEMBER)).toBe("Collaborator");
		});

		it("should return Collaborator as default for unknown roles", () => {
			
			expect(getRoleLabel("UNKNOWN" as UserRole)).toBe("Collaborator");
			expect(getRoleLabel("INVALID" as UserRole)).toBe("Collaborator");
			expect(getRoleLabel(null as unknown as UserRole)).toBe("Collaborator");
			expect(getRoleLabel(undefined as unknown as UserRole)).toBe("Collaborator");
		});

		it("should handle all valid UserRole enum values", () => {
			
			const roles = Object.values(UserRole);
			const labels = roles.map((role) => getRoleLabel(role));
			expect(labels).toContain("Owner");
			expect(labels).toContain("Admin");
			expect(labels).toContain("Collaborator");
			
			expect(labels.every((label) => typeof label === "string" && label.length > 0)).toBe(true);
		});

		it("should be consistent with repeated calls", () => {
			expect(getRoleLabel(UserRole.OWNER)).toBe(getRoleLabel(UserRole.OWNER));
			expect(getRoleLabel(UserRole.ADMIN)).toBe(getRoleLabel(UserRole.ADMIN));
			expect(getRoleLabel(UserRole.MEMBER)).toBe(getRoleLabel(UserRole.MEMBER));
		});
	});
});

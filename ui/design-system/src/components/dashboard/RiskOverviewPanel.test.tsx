import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { RiskOverviewPanel, RiskEntry } from "./RiskOverviewPanel";

describe("RiskOverviewPanel", () => {
    const mockRisks: RiskEntry[] = [
        { id: "1", category: "Data Privacy", level: "High" },
        { id: "2", category: "Access Control", level: "Medium" },
        { id: "3", category: "Network Security", level: "Low" },
    ];

    it("renders the panel title", () => {
        render(<RiskOverviewPanel risks={mockRisks} />);
        expect(screen.getByText("Risk Overview")).toBeDefined();
    });

    it("renders all risk entries", () => {
        render(<RiskOverviewPanel risks={mockRisks} />);
        expect(screen.getByText("Data Privacy")).toBeDefined();
        expect(screen.getByText("Access Control")).toBeDefined();
        expect(screen.getByText("Network Security")).toBeDefined();
    });

    it("renders risk levels correctly", () => {
        render(<RiskOverviewPanel risks={mockRisks} />);
        expect(screen.getByText("High")).toBeDefined();
        expect(screen.getByText("Medium")).toBeDefined();
        expect(screen.getByText("Low")).toBeDefined();
    });

    it("renders empty state when no risks provided", () => {
        render(<RiskOverviewPanel risks={[]} />);
        expect(screen.getByText("No risks found.")).toBeDefined();
    });

    it("applies neutral styling classes", () => {
        render(<RiskOverviewPanel risks={mockRisks} />);
        const panel = screen.getByTestId("risk-overview-panel");
        expect(panel.className).toContain("bg-white/5");
        expect(panel.className).toContain("border-white/10");
    });
});

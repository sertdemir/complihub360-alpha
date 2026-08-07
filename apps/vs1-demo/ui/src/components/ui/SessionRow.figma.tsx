import figma from "@figma/code-connect";
import { SessionRow } from "./SessionRow";
import { Button } from "./Button";

// Code Connect: Compass "Session Row" (1450:693) -> SessionRow.
figma.connect(
  SessionRow,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1450-693",
  {
    props: {
      country: figma.string("Country"),
      domain: figma.string("Domain"),
      status: figma.string("Status Label"),
      updated: figma.string("Updated"),
      title: figma.string("Title"),
      riskLine: figma.string("Risk Line"),
      risk: figma.enum("Risk", { High: "high", Medium: "medium", Low: "low" }),
    },
    example: ({ country, domain, status, updated, title, riskLine, risk }) => (
      <SessionRow
        country={country} domain={domain} status={status} updated={updated}
        title={title} riskLine={riskLine} risk={risk}
        action={<Button variant="accent" size="sm">Open</Button>}
      />
    ),
  }
);

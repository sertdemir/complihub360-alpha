import figma from "@figma/code-connect";
import { RequestCard } from "./RequestCard";
import { Button } from "./Button";

// Code Connect: Compass "Request Card" (1444:605) -> RequestCard.
figma.connect(
  RequestCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1444-605",
  {
    props: {
      context: figma.string("Context"),
      statusLabel: figma.string("Status Label"),
      company: figma.string("Company"),
      meta: figma.string("Meta"),
      slaValue: figma.string("SLA Value"),
      status: figma.enum("Status", {
        "Awaiting Confirm": "awaiting-confirm",
        "Awaiting Reply": "awaiting-reply",
        Active: "active",
      }),
    },
    example: ({ context, status, statusLabel, company, meta, slaValue }) => (
      <RequestCard
        context={context} status={status} statusLabel={statusLabel}
        company={company} meta={meta} slaValue={slaValue}
        action={<Button variant="primary" size="sm">Open · confirm</Button>}
      />
    ),
  }
);

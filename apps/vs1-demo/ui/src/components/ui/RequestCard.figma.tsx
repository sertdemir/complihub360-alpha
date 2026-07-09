import figma from "@figma/code-connect";
import { RequestCard } from "./RequestCard";
import { Button } from "./Button";

// Code Connect: Compass "Request Card" (1444:605) -> RequestCard.
figma.connect(
  RequestCard,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1444-605",
  {
    props: {
      idLine: figma.string("ID Line"),
      statusLabel: figma.string("Status Label"),
      company: figma.string("Company"),
      tag: figma.string("Tag"),
      meta: figma.string("Meta"),
      slaValue: figma.string("SLA Value"),
      status: figma.enum("Status", {
        "Awaiting Confirm": "awaiting-confirm",
        "Awaiting Reply": "awaiting-reply",
        Active: "active",
      }),
    },
    example: ({ idLine, status, statusLabel, company, tag, meta, slaValue }) => (
      <RequestCard
        idLine={idLine} status={status} statusLabel={statusLabel}
        company={company} tag={tag} meta={meta} slaValue={slaValue}
        action={<Button variant="accent" size="sm">Open · confirm</Button>}
      />
    ),
  }
);

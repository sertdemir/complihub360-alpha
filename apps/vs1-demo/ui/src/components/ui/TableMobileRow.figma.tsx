import figma from "@figma/code-connect";
import { TableMobileRow } from "./TableMobileRow";

// Code Connect: Compass "Table Mobile Row" (1442:777) -> TableMobileRow.
figma.connect(
  TableMobileRow,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1442-777",
  {
    props: {
      title: figma.string("Title"),
      sub: figma.string("Sub"),
      value: figma.string("Value"),
      status: figma.string("Status Label"),
      statusTone: figma.enum("Status", {
        Success: "success",
        Error: "error",
        Warning: "warning",
        Info: "info",
        Neutral: "neutral",
      }),
    },
    example: ({ title, sub, value, status, statusTone }) => (
      <TableMobileRow title={title} sub={sub} value={value} status={status} statusTone={statusTone} />
    ),
  }
);

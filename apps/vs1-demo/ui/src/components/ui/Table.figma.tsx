import figma from "@figma/code-connect";
import { Table, THead, TBody, TR, TH, TD } from "./Table";

// Code Connect: Compass "Table" set (801:648) → Table.
// Layout → striped flag. Header/Row/Cell variants map to THead/TR/TH/TD usage.
figma.connect(
  Table,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=801-648",
  {
    props: {
      striped: figma.enum("Layout", { Standard: false, Striped: true, "Card-wrapped": false }),
    },
    example: ({ striped }) => (
      <Table striped={striped}>
        <THead>
          <TR>
            <TH>Provider</TH>
            <TH numeric>Match</TH>
          </TR>
        </THead>
        <TBody>
          <TR>
            <TD>Dahlmann CPA</TD>
            <TD numeric>94%</TD>
          </TR>
        </TBody>
      </Table>
    ),
  }
);

import figma from "@figma/code-connect";
import { DateMark } from "./DateMark";

// Code Connect: Compass "Date Mark" (2187:13624) -> DateMark.
figma.connect(
  DateMark,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=2187-13624",
  {
    props: {
      size: figma.enum("Size", { S: "sm", M: "md", L: "lg" }),
      soon: figma.enum("State", { Default: false, Soon: true }),
    },
    example: ({ size, soon }) => <DateMark iso="2026-09-28T09:00:00Z" locale="de" size={size} soon={soon} />,
  }
);

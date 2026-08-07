import figma from "@figma/code-connect";
import { NavItem, DomainTab, MobileTopbar } from "./AppShell";
import { LogoMark } from "./Logo";

// Code Connect: Compass AppShell atoms.
// "Nav Item" (974:1223) → NavItem; "Domain Tab" (984:56) → DomainTab.
figma.connect(
  NavItem,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=974-1223",
  {
    props: {
      label: figma.string("Label"),
      count: figma.string("Count"),
      active: figma.enum("Active", { True: true, False: false }),
    },
    example: ({ label, count, active }) => <NavItem label={label} count={count} active={active} />,
  }
);

figma.connect(
  DomainTab,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=984-56",
  {
    props: {
      label: figma.string("Label"),
      active: figma.enum("Active", { True: true, False: false }),
    },
    example: ({ label, active }) => <DomainTab label={label} active={active} />,
  }
);

figma.connect(
  MobileTopbar,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1420-8695",
  {
    example: () => (
      <MobileTopbar
        logo={<LogoMark tone="on-petrol" className="h-[22px] w-auto" />}
        contextLabel="Partner"
        actions={<>{/* search icon · verified badge */}</>}
      />
    ),
  }
);

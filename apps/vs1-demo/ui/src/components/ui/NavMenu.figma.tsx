import figma from "@figma/code-connect";
import { NavMenu, NavMenuTrigger, NavMenuItem } from "./NavMenu";

// Code Connect: Compass page "⌄ Nav Menu" → NavMenu.
//
// Three sets, because the pattern is compositional rather than configurable:
// the panel's contents differ per call site (plain links for the languages,
// links with a description for the areas), so the shape is a structure, not a
// prop. The Figma sets mirror that one-to-one.
//
// The Figma-only axes are the ones React keeps as internal state: Trigger
// `State=Open` and Item `State=Hover|Focus` have no React prop, because the
// component owns them. They are mapped where an equivalent prop exists
// (`Active` → isActive, `Current` → isCurrent) and left out where it does not.

// ─── The panel surface ───────────────────────────────────────────────────────
figma.connect(
  NavMenu,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1770-188",
  {
    props: {
      panel: figma.enum("Panel", { Sheet: "sheet", Popover: "popover" }),
      columns: figma.enum("Columns", { "1": 1, "2": 2 } as const),
    },
    example: ({ panel, columns }) => (
      <NavMenu panel={panel} columns={columns}>
        <NavMenu.Trigger label="Compliance areas" />
        <NavMenu.Panel
          title="Choose a compliance area"
          aside={<NavMenu.Footer href="/en/compliance">All compliance areas</NavMenu.Footer>}
        >
          <NavMenu.Item
            href="/en/compliance/tax-vat"
            description="Cross-border VAT, delivery thresholds and digital taxation"
          >
            Tax &amp; VAT
          </NavMenu.Item>
          <NavMenu.Item
            href="/en/compliance/data-privacy"
            description="GDPR, UK GDPR, cookie compliance and data transfers"
            isCurrent
          >
            Data &amp; Privacy
          </NavMenu.Item>
        </NavMenu.Panel>
      </NavMenu>
    ),
  }
);

// ─── The trigger ─────────────────────────────────────────────────────────────
// `State=Open` is deliberately unmapped: in React the open state lives inside
// NavMenu, so there is no prop to point at. Figma carries it because a static
// canvas has to draw the open case somehow.
figma.connect(
  NavMenuTrigger,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1769-56",
  {
    props: {
      label: figma.string("label"),
      iconOnly: figma.enum("Mode", { Label: false, IconOnly: true }),
      isActive: figma.enum("State", { Active: true, Default: false, Hover: false, Open: false }),
    },
    example: ({ label, iconOnly, isActive }) => (
      <NavMenu.Trigger label={label} iconOnly={iconOnly} isActive={isActive} />
    ),
  }
);

// ─── One destination ─────────────────────────────────────────────────────────
// `Layout` has no prop either — NavMenu.Item reads the panel shape from
// context, so a sheet item and a popover item are the same call. Mapping it to
// a prop that does not exist would be a lie the generated snippet tells.
figma.connect(
  NavMenuItem,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1768-59",
  {
    props: {
      label: figma.string("label"),
      description: figma.string("description"),
      isCurrent: figma.enum("State", { Current: true, Default: false, Hover: false, Focus: false }),
    },
    example: ({ label, description, isCurrent }) => (
      <NavMenu.Item href="/en/compliance/tax-vat" description={description} isCurrent={isCurrent}>
        {label}
      </NavMenu.Item>
    ),
  }
);

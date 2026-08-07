import figma from "@figma/code-connect";
import { Tabs, TabList, Tab } from "./Tabs";

// Code Connect: Compass "Desktop Tabbar" (612:344) → Tabs.
// Style → variant (underline/filled/boxed), Size → size. Tab items are composed
// as <Tab> children (Compass "Desktop Tab Item" 609:2).
figma.connect(
  Tabs,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=612-344",
  {
    props: {
      variant: figma.enum("Style", { Underline: "underline", Filled: "filled", Boxed: "boxed" }),
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
    },
    example: ({ variant, size }) => (
      <Tabs variant={variant} size={size} defaultValue="active">
        <TabList>
          <Tab value="active">Active</Tab>
          <Tab value="archive">Archive</Tab>
        </TabList>
      </Tabs>
    ),
  }
);

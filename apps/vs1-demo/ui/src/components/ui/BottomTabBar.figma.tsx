import figma from "@figma/code-connect";
import { BottomTabBar } from "./BottomTabBar";

// Code Connect: Compass "Mobile Bottom Tabbar" container set (623:335) → BottomTabBar.
// Figma Type axis (Icon Only · Icon + Label · Icon + Label + Badge) is expressed in
// code via the tabs[] content (label optional, badge optional).
figma.connect(
  BottomTabBar,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=623-335",
  {
    props: {},
    example: () => (
      <BottomTabBar
        active="home"
        tabs={[
          { key: "home", label: "Home", icon: null },
          { key: "search", label: "Search", icon: null },
          { key: "alerts", label: "Alerts", icon: null, badge: 3 },
          { key: "me", label: "Profile", icon: null },
        ]}
      />
    ),
  }
);

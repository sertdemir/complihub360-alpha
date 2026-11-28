import figma from "@figma/code-connect";
import { ScrollBox } from "./ScrollBox";

// Code Connect: Compass "Scroll Box" (2279:55) → ScrollBox.
// Show Fade → fade; State=Focus ist der Tastaturfokus und im Code kein Prop.
// Content ist der Slot → children.
figma.connect(
  ScrollBox,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=2279-55",
  {
    props: {
      fade: figma.boolean("Show Fade"),
      content: figma.instance("Content"),
    },
    example: ({ fade, content }) => (
      <ScrollBox label="Beta-Vereinbarung, zehn Punkte" fade={fade} className="max-h-[40vh]">
        {content}
      </ScrollBox>
    ),
  }
);

import figma from "@figma/code-connect";
import { Modal } from "./Modal";

// Code Connect: Compass "Modal Surface" (739:2) → Modal. Size → size; the Type
// (Default/Confirm/Destructive/Form) is expressed in code via title + footer content.
figma.connect(
  Modal,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=739-2",
  {
    props: {
      size: figma.enum("Size", { SM: "sm", MD: "md", LG: "lg" }),
    },
    example: ({ size }) => (
      <Modal open onClose={() => {}} size={size} title="Modal title" description="Supporting description.">
        Modal body content.
      </Modal>
    ),
  }
);

import figma from "@figma/code-connect";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./Card";

figma.connect(
  Card,
  "https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=46:11",
  {
    props: {
      title: figma.string("Title"),
      description: figma.string("Description"),
    },
    example: ({ title, description }) => (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{/* card content */}</CardContent>
      </Card>
    ),
  }
);

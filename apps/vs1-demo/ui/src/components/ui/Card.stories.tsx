import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from './Button';

const meta = {
  title: 'Atoms/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Create Project</CardTitle>
        <CardDescription>Deploy your new project in one click.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
            <div className="text-body text-neutral-800">Fill in the necessary fields below to get started on your Compliance configuration.</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
};

// Card Base set (664:50): Style Outlined / Filled / Elevated × State Default / Disabled.
const StyleDemo = () => (
  <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
    {(['outlined', 'filled', 'elevated'] as const).map((styleVariant) => (
      <Card key={styleVariant} styleVariant={styleVariant} interactive>
        <CardHeader>
          <CardTitle className="capitalize">{styleVariant}</CardTitle>
          <CardDescription>styleVariant=&quot;{styleVariant}&quot;</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-body-sm text-fg-secondary">Hover to see the interactive affordance.</p>
        </CardContent>
      </Card>
    ))}
    <Card styleVariant="outlined" selected>
      <CardHeader>
        <CardTitle>Selected</CardTitle>
        <CardDescription>selected</CardDescription>
      </CardHeader>
    </Card>
    <Card styleVariant="outlined" disabled>
      <CardHeader>
        <CardTitle>Disabled</CardTitle>
        <CardDescription>disabled</CardDescription>
      </CardHeader>
    </Card>
  </div>
);

export const Styles: Story = {
  parameters: { layout: 'padded' },
  render: () => <div className="bg-neutral-50 p-6">{StyleDemo()}</div>,
};

export const StylesDark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => <div className="dark min-h-screen bg-[#1F2937] p-8">{StyleDemo()}</div>,
};

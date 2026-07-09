import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './Button';

const DESCRIPTION = `
Centered dialog overlay — backdrop + panel with header/body/footer. Escape / backdrop-click
close, scroll-lock, portal on \`<body>\`, **light + dark**.
`;

const meta = {
  title: 'Organisms/Modal',
  parameters: { layout: 'centered', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Adds `dark` to the document root so the portalled overlay (on <body>) is dark too.
function DarkScope({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);
  return <div className="dark min-h-screen bg-[#1F2937] p-8">{children}</div>;
}

function ModalDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open modal</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel this engagement request?"
        description="The provider has not responded yet."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Keep request</Button>
            <Button variant="danger" onClick={() => setOpen(false)}>Cancel request</Button>
          </>
        }
      >
        Cancelling now withdraws your request from the provider's queue. You can send a new request at any
        time — your assessment results stay saved.
      </Modal>
    </>
  );
}

export const Default: Story = { name: 'Modal', render: () => <ModalDemo /> };
export const Dark: Story = { name: 'Modal (dark)', parameters: { layout: 'fullscreen' }, render: () => <DarkScope><ModalDemo /></DarkScope> };

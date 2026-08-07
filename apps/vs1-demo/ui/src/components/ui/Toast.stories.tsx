import { useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from './Toast';
import { Button } from './Button';

const DESCRIPTION = `
Transient bottom-right notification stack. \`ToastProvider\` portals onto \`<body>\`,
\`useToast().toast({ title, description?, status?, duration? })\` enqueues. Auto-dismiss +
manual ✕, slide/fade via framer-motion, **light + dark**.
`;

const meta = {
  title: 'Molecules/Toast',
  parameters: { layout: 'centered', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Adds `dark` to the document root so the portalled stack (on <body>) is dark too.
function DarkScope({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);
  return <div className="dark min-h-screen bg-[#1F2937] p-8">{children}</div>;
}

function Demo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        onClick={() =>
          toast({
            status: 'info',
            title: 'Assessment saved',
            description: 'Your draft VAT assessment was autosaved to your workspace.',
          })
        }
      >
        Info
      </Button>
      <Button
        onClick={() =>
          toast({
            status: 'success',
            title: 'Engagement sent',
            description: 'The provider will respond within 24h.',
          })
        }
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast({
            status: 'warning',
            title: 'Response time slipping',
            description: 'This provider is approaching their SLA window.',
          })
        }
      >
        Warning
      </Button>
      <Button
        variant="danger"
        onClick={() =>
          toast({
            status: 'error',
            title: 'Upload failed',
            description: 'We could not process your evidence file. Please try again.',
          })
        }
      >
        Error
      </Button>
    </div>
  );
}

export const Light: Story = {
  render: () => (
    <ToastProvider>
      <Demo />
    </ToastProvider>
  ),
};

export const Dark: Story = {
  parameters: { layout: 'fullscreen' },
  render: () => (
    <DarkScope>
      <ToastProvider>
        <Demo />
      </ToastProvider>
    </DarkScope>
  ),
};

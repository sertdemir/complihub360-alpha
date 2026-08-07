import type { Meta, StoryObj } from '@storybook/react';
import { FileUpload } from './FileUpload';

const DESCRIPTION = `
**FileUpload** — a dashed dropzone plus a list of selected files. Supports
drag-and-drop or click-to-browse, \`accept\` / \`maxSizeMB\` validation, per-file
remove, and optional per-file progress bars. Controlled via \`value\` /
\`onFilesChange\`, or self-managed if both are omitted. Ships **light AND dark**.

- **\`accept\`** — native input accept attr, also drives validation (\`.pdf,image/*\`).
- **\`multiple\`** (default true) · **\`maxSizeMB\`** — rejected files surface inline errors.
- **\`value\` / \`onFilesChange\`** — controlled mode · **\`progress\`** — \`{ \`name-size\`: 0..100 }\`.
- On drag-over the zone switches to \`border-stroke-brand bg-brand-light\`.
`;

// Mock File objects for the populated stories.
const mockFiles: File[] = [
  new File([new Blob(['x'.repeat(248_000)])], 'VAT-cert-2026.pdf', { type: 'application/pdf' }),
  new File([new Blob(['x'.repeat(1_640_000)])], 'beneficial-owners.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  }),
  new File([new Blob(['x'.repeat(86_000)])], 'logo.png', { type: 'image/png' }),
];

const meta = {
  title: 'Molecules/FileUpload',
  component: FileUpload,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
  argTypes: {
    multiple: { control: 'boolean' },
    disabled: { control: 'boolean' },
    maxSizeMB: { control: 'number' },
    accept: { control: 'text' },
  },
} satisfies Meta<typeof FileUpload>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    accept: '.pdf,.xlsx,image/*',
    multiple: true,
    maxSizeMB: 10,
  },
};

export const Empty: Story = {
  name: 'Empty dropzone',
  args: { accept: '.pdf,.xlsx,image/*', maxSizeMB: 10 },
  parameters: { controls: { disable: true } },
  render: (args) => <FileUpload {...args} />,
};

export const WithFiles: Story = {
  name: 'With files',
  args: { accept: '.pdf,.xlsx,image/*', maxSizeMB: 10, value: mockFiles, onFilesChange: () => {} },
  parameters: { controls: { disable: true } },
  render: (args) => <FileUpload {...args} />,
};

export const WithProgress: Story = {
  name: 'With per-file progress',
  args: {
    accept: '.pdf,.xlsx,image/*',
    value: mockFiles,
    onFilesChange: () => {},
    progress: {
      [`${mockFiles[0].name}-${mockFiles[0].size}`]: 100,
      [`${mockFiles[1].name}-${mockFiles[1].size}`]: 62,
      [`${mockFiles[2].name}-${mockFiles[2].size}`]: 24,
    },
  },
  parameters: { controls: { disable: true } },
  render: (args) => <FileUpload {...args} />,
};

export const Light: Story = {
  args: { accept: '.pdf,.xlsx,image/*', maxSizeMB: 10 },
  parameters: { controls: { disable: true } },
  render: (args) => (
    <div className="max-w-xl space-y-8 bg-neutral-50 p-6">
      <FileUpload {...args} />
      <FileUpload {...args} value={mockFiles} onFilesChange={() => {}} />
    </div>
  ),
};

export const Dark: Story = {
  args: { accept: '.pdf,.xlsx,image/*', maxSizeMB: 10 },
  parameters: { layout: 'fullscreen', controls: { disable: true }, backgrounds: { default: 'dark' } },
  render: (args) => (
    <div className="dark min-h-screen bg-[#0F172A] p-6">
      <div className="max-w-xl space-y-8">
        <FileUpload {...args} />
        <FileUpload {...args} value={mockFiles} onFilesChange={() => {}} />
      </div>
    </div>
  ),
};

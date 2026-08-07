import { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Check, ArrowRight } from 'lucide-react';
import { Drawer } from './Drawer';
import { Button } from './Button';

const DESCRIPTION = `
Overlay side panel sliding in from the right — header (eyebrow + title) + body + footer.
**Adaptive height**: hugs content, clamped to \`[--drawer-min-h, --drawer-max-h]\` (400 / 1000);
beyond max the body scrolls while header + footer stay pinned. Sizes \`sm / md / lg\` → 440 / 520 / 540
(Compass SM / MD / L). Escape / backdrop-click close, scroll-lock, portal on \`<body>\`, **light + dark**.
`;

const meta = {
  title: 'Organisms/Drawer',
  parameters: { layout: 'centered', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj;

// Adds `dark` to the document root so the portalled overlay (on <body>) is dark too.
// Colorful blobs sit behind so the drawer's glass (translucent + backdrop-blur)
// visibly frosts the content — a flat background would hide the effect.
function DarkScope({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.add('dark');
    return () => document.documentElement.classList.remove('dark');
  }, []);
  return (
    <div className="dark relative min-h-screen overflow-hidden bg-[#0e1622] p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[6%] top-[10%] h-80 w-80 rounded-full bg-[#14a89a] opacity-80" />
        <div className="absolute right-[16%] top-[44%] h-72 w-72 rounded-full bg-[#d4af37] opacity-70" />
        <div className="absolute bottom-[8%] left-[28%] h-64 w-64 rounded-full bg-[#3b6cff] opacity-60" />
        <div className="absolute bottom-[18%] right-[5%] h-60 w-60 rounded-full bg-[#e0556b] opacity-60" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const cover = ['OSS / IOSS quarterly returns', 'Distance-selling threshold monitoring', 'Intra-community supply VAT', 'Reverse-charge mechanism', 'Per-market VAT registrations'];
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open side sheet</Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Domain"
        title="VAT & Tax"
        headerExtra={
          <p>
            <span className="font-medium text-fg-brand">Active in:</span> DE · UK · NL · FR · IT · ES
          </p>
        }
        footer={
          <Button fullWidth className="bg-brand-accent text-fg-on-accent hover:bg-accent-600">
            See if this applies to you <ArrowRight size={16} className="ml-1.5" />
          </Button>
        }
      >
        <p className="mb-5 text-body-sm leading-relaxed text-fg-secondary">
          Cross-border VAT, OSS/IOSS, intra-community supply, distance-selling thresholds. Six markets means
          six VAT regimes, six registration thresholds, six filing cadences. We track each.
        </p>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-tertiary">What we cover</p>
        <ul className="space-y-2.5">
          {cover.map((c) => (
            <li key={c} className="flex items-center gap-2.5 text-body-sm text-fg">
              <Check size={16} className="shrink-0 text-fg-brand" strokeWidth={2.5} />
              {c}
            </li>
          ))}
        </ul>
      </Drawer>
    </>
  );
}

// Light scope — light surface with soft pastel blobs behind so the white glass
// (translucent + backdrop-blur) is visible.
function LightScope({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eef1f4] p-8">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[6%] top-[10%] h-80 w-80 rounded-full bg-[#14a89a] opacity-40" />
        <div className="absolute right-[16%] top-[44%] h-72 w-72 rounded-full bg-[#d4af37] opacity-40" />
        <div className="absolute bottom-[8%] left-[28%] h-64 w-64 rounded-full bg-[#3b6cff] opacity-30" />
        <div className="absolute bottom-[18%] right-[5%] h-60 w-60 rounded-full bg-[#e0556b] opacity-30" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

export const Default: Story = { name: 'Drawer (side sheet)', render: () => <DrawerDemo /> };
export const Light: Story = { name: 'Drawer (light glass)', parameters: { layout: 'fullscreen' }, render: () => <LightScope><DrawerDemo /></LightScope> };
export const Dark: Story = { name: 'Drawer (dark)', parameters: { layout: 'fullscreen' }, render: () => <DarkScope><DrawerDemo /></DarkScope> };

// Size showcase — sm/md/lg map to 440 / 520 / 540 (Compass SM / MD / L).
function SizeDemo({ size, label }: { size: 'sm' | 'md' | 'lg'; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>{label}</Button>
      <Drawer open={open} onClose={() => setOpen(false)} size={size} eyebrow="Domain" title="VAT & Tax"
        footer={<Button fullWidth>Confirm <ArrowRight size={16} className="ml-1.5" /></Button>}>
        <p className="text-body-sm leading-relaxed text-fg-secondary">
          Little content — the panel hugs to <code>--drawer-min-h</code> (400px) and sits centered on the edge.
        </p>
      </Drawer>
    </>
  );
}
export const Sizes: Story = {
  name: 'Sizes (sm · md · lg)',
  render: () => (
    <div className="flex gap-3">
      <SizeDemo size="sm" label="sm · 440" />
      <SizeDemo size="md" label="md · 520" />
      <SizeDemo size="lg" label="lg · 540" />
    </div>
  ),
};

// Tall content — exceeds --drawer-max-h (1000px), so the body scrolls while
// header + footer stay pinned.
export const TallScroll: Story = {
  name: 'Adaptive height + scroll',
  render: () => {
    function Demo() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <Button onClick={() => setOpen(true)}>Open long drawer</Button>
          <Drawer open={open} onClose={() => setOpen(false)} size="lg" eyebrow="Markets" title="Pick the markets you sell into"
            footer={<Button fullWidth>Add selected <ArrowRight size={16} className="ml-1.5" /></Button>}>
            <ul className="space-y-3">
              {Array.from({ length: 40 }, (_, i) => (
                <li key={i} className="flex items-center gap-2.5 rounded-lg border border-stroke px-3 py-2.5 text-body-sm text-fg">
                  <Check size={16} className="shrink-0 text-fg-brand" /> Market option #{i + 1}
                </li>
              ))}
            </ul>
          </Drawer>
        </>
      );
    }
    return <Demo />;
  },
};

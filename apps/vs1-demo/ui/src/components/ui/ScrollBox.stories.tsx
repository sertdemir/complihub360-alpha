import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollBox } from './ScrollBox';

const DESCRIPTION = `
**ScrollBox** — langer Text auf festem Platz (Compass "Scroll Box"). Der Kasten ist mit der
Tastatur erreichbar und trägt einen Namen; der Auslauf unten zeigt, dass es weitergeht, und
verschwindet am Textende. Die Höhe legt der Aufrufer über \`className\` fest.
`;

const meta = {
  title: 'Molecules/ScrollBox',
  component: ScrollBox,
  parameters: { layout: 'padded', docs: { description: { component: DESCRIPTION } } },
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollBox>;

export default meta;
type Story = StoryObj<typeof ScrollBox>;

const POINTS = [
  ['Das ist ein Test.', 'Sie nutzen eine unfertige Version von CompliHub360, auf Einladung, für eine begrenzte Zeit. Was offen ist, sagen wir Ihnen, bevor Sie es brauchen.'],
  ['Es kostet nichts.', 'In der Beta wird nichts berechnet und nichts abgebucht. Zahlungsfunktionen laufen im Testmodus.'],
  ['Es kann schiefgehen.', 'Ausfälle, Fehler und Datenverlust sind in einer Beta möglich. Wenn etwas passiert ist, sagen wir es Ihnen, ohne dass Sie fragen müssen.'],
  ['Keine Rechtsberatung.', 'Risk Map und Antworten sind Orientierung, kein Ersatz für eine Prüfung Ihres Falls. CompliHub360 ist keine Kanzlei.'],
  ['Anbieter sind Testkonten.', 'In der Beta gibt es noch keine echten Anbieter. Alle Anbieter, die Sie sehen und buchen können, sind Testkonten mit erfundenen Namen.'],
  ['Ihre Daten.', 'Was Sie eingeben, nutzen wir für den Test und für nichts anderes. Sie können Ihr Konto jederzeit löschen.'],
];

const Sheet = ({ count = POINTS.length }: { count?: number }) => (
  <ol className="space-y-2">
    {POINTS.slice(0, count).map(([lead, text], i) => (
      <li key={i} className="flex gap-2.5 text-body-xs leading-snug text-fg">
        <span className="w-5 shrink-0 font-mono text-fg-tertiary">{String(i + 1).padStart(2, '0')}</span>
        <span><strong className="font-semibold">{lead}</strong> <span className="text-fg-secondary">{text}</span></span>
      </li>
    ))}
  </ol>
);

export const Default: Story = {
  name: 'Mit Auslauf',
  args: { label: 'Beta-Vereinbarung, sechs Punkte' },
  render: (args) => (
    <div className="w-[420px] bg-white p-6">
      <ScrollBox {...args} className="h-[280px]"><Sheet /></ScrollBox>
    </div>
  ),
};

export const FitsWithoutScrolling: Story = {
  name: 'Passt ganz hinein: kein Auslauf',
  args: { label: 'Beta-Vereinbarung, zwei Punkte' },
  render: (args) => (
    <div className="w-[420px] bg-white p-6">
      <ScrollBox {...args} className="max-h-[280px]"><Sheet count={2} /></ScrollBox>
    </div>
  ),
};

export const Dark: Story = {
  args: { label: 'Beta-Vereinbarung, sechs Punkte' },
  parameters: { layout: 'fullscreen' },
  render: (args) => (
    <div className="dark min-h-screen bg-[#1F2937] p-8">
      <div className="w-[420px]"><ScrollBox {...args} className="h-[280px]"><Sheet /></ScrollBox></div>
    </div>
  ),
};

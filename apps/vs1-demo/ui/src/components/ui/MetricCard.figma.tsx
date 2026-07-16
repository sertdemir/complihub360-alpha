import figma from '@figma/code-connect';
import { MetricCard } from './MetricCard';

// Code Connect: Compass "Metric Card" component set (1517:656, Cards page) →
// the MetricCard code component. Color variant → chart accent color, State →
// series presence (Empty = no series → "no data" state), text props → props.
figma.connect(
  MetricCard,
  'https://www.figma.com/design/a4BeKbsBGoHkcudhKXUJTl?node-id=1517-656',
  {
    props: {
      label: figma.string('Label'),
      value: figma.string('Value'),
      compare: figma.string('Compare'),
      updated: figma.string('Updated'),
      color: figma.enum('Color', {
        Brand: '#097070',
        Success: '#3C8C7A',
        Warning: '#C59E38',
        Error: '#B55353',
      }),
      series: figma.enum('State', {
        Default: [3, 5, 4, 8, 6, 9, 12],
        Empty: undefined,
      }),
    },
    example: ({ label, value, compare, updated, color, series }) => (
      <MetricCard
        label={label}
        value={value}
        compare={compare}
        updated={updated}
        color={color}
        series={series}
        xLabels={['10.07', '11.07', '12.07', '13.07', '14.07', '15.07', '16.07']}
        detailsLabel="Weitere Details"
      />
    ),
  },
);

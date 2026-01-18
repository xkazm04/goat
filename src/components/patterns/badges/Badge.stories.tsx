import type { Meta, StoryObj } from '@storybook/react';
import { Star, Trophy, Heart, Sparkles, Award } from 'lucide-react';
import { Badge, BadgeGroup, PositionedBadge, badgeColors } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Patterns/Badges/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Base badge component for displaying status indicators, labels, and tags.

## Features
- Multiple size variants (xs, sm, md, lg)
- Customizable colors with presets
- Optional icon support
- Animation variants (pulse, bounce, none)
- Flexible positioning with PositionedBadge wrapper
        `,
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg'],
      description: 'Badge size variant',
    },
    animation: {
      control: 'select',
      options: ['none', 'pulse', 'bounce'],
      description: 'Animation effect',
    },
    color: {
      control: 'object',
      description: 'Color configuration for background and text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'Badge',
  },
};

export const WithIcon: Story = {
  args: {
    children: 'Featured',
    icon: Star,
    color: badgeColors.gold,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Badge size="xs">Extra Small</Badge>
      <Badge size="sm">Small</Badge>
      <Badge size="md">Medium</Badge>
      <Badge size="lg">Large</Badge>
    </div>
  ),
};

export const Colors: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge color={badgeColors.gold} icon={Trophy}>Gold</Badge>
      <Badge color={badgeColors.silver} icon={Award}>Silver</Badge>
      <Badge color={badgeColors.bronze} icon={Star}>Bronze</Badge>
      <Badge color={badgeColors.primary}>Primary</Badge>
      <Badge color={badgeColors.success}>Success</Badge>
      <Badge color={badgeColors.warning}>Warning</Badge>
      <Badge color={badgeColors.default}>Default</Badge>
    </div>
  ),
};

export const Animated: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Badge>No Animation</Badge>
      <Badge color={badgeColors.gold}>Gold Badge</Badge>
      <Badge color={badgeColors.primary}>Primary Badge</Badge>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Badge icon={Star} color={badgeColors.gold}>Star</Badge>
      <Badge icon={Trophy} color={badgeColors.silver}>Trophy</Badge>
      <Badge icon={Heart} color={badgeColors.primary}>Heart</Badge>
      <Badge icon={Sparkles} color={badgeColors.success}>Sparkles</Badge>
    </div>
  ),
};

export const BadgeGroupExample: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-zinc-500 mb-2">Default (shows all)</p>
        <BadgeGroup>
          <Badge>Tag 1</Badge>
          <Badge>Tag 2</Badge>
          <Badge>Tag 3</Badge>
          <Badge>Tag 4</Badge>
        </BadgeGroup>
      </div>
      <div>
        <p className="text-sm text-zinc-500 mb-2">Max 2 (shows +2)</p>
        <BadgeGroup max={2}>
          <Badge>Tag 1</Badge>
          <Badge>Tag 2</Badge>
          <Badge>Tag 3</Badge>
          <Badge>Tag 4</Badge>
        </BadgeGroup>
      </div>
    </div>
  ),
};

export const PositionedBadgeExample: Story = {
  render: () => (
    <div className="flex gap-8">
      <div className="relative w-24 h-24 bg-zinc-800 rounded-lg">
        <PositionedBadge position="top-right">
          <Badge size="xs" color={badgeColors.gold}>1</Badge>
        </PositionedBadge>
      </div>
      <div className="relative w-24 h-24 bg-zinc-800 rounded-lg">
        <PositionedBadge position="top-left">
          <Badge size="xs" color={badgeColors.primary}>New</Badge>
        </PositionedBadge>
      </div>
      <div className="relative w-24 h-24 bg-zinc-800 rounded-lg">
        <PositionedBadge position="bottom-right">
          <Badge size="xs" color={badgeColors.success}>5</Badge>
        </PositionedBadge>
      </div>
      <div className="relative w-24 h-24 bg-zinc-800 rounded-lg">
        <PositionedBadge position="bottom-left">
          <Badge size="xs" color={badgeColors.warning}>Info</Badge>
        </PositionedBadge>
      </div>
    </div>
  ),
};

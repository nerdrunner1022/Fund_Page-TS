import { useMemo, type CSSProperties } from 'react';
import { formatPercent } from '../lib/money';
import type { Campaign, CampaignCopy } from '../types';

interface Block {
  kind: 'full' | 'partial' | 'empty';
  value: number;
}

export function LandProgress({
  campaign,
  copy,
  raisedMinor,
  percent,
}: {
  campaign: Campaign;
  copy: CampaignCopy;
  raisedMinor: string;
  percent: number;
}) {
  const blocks = useMemo<Block[]>(() => {
    const raised = Number(BigInt(raisedMinor));
    const goal = Number(BigInt(campaign.goalMinor));
    const perches = goal > 0 ? Math.min(raised / goal, 1) * campaign.perchCount : 0;

    return Array.from({ length: campaign.perchCount }, (_, index) => {
      const value = perches - index;
      if (value >= 1) return { kind: 'full' as const, value: 1 };
      if (value > 0) return { kind: 'partial' as const, value };
      return { kind: 'empty' as const, value: 0 };
    });
  }, [raisedMinor, campaign.goalMinor, campaign.perchCount]);

  return (
    <div
      id="land"
      className="land"
      role="img"
      aria-label={`${formatPercent(percent)}% ${copy.funded}`}
    >
      {blocks.map((block, index) => (
        <i
          key={index}
          className={block.kind === 'empty' ? undefined : block.kind === 'full' ? 'f' : 'p'}
          style={
            block.kind === 'partial'
              ? ({ '--p': `${block.value * 100}%` } as CSSProperties)
              : undefined
          }
        />
      ))}
    </div>
  );
}

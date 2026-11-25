import { useCampaignCopy } from '../hooks/useCampaignCopy';
import { Countdown } from './Countdown';
import { TopBar } from './TopBar';
import type { Campaign } from '../types';

export function CampaignHero({ campaign }: { campaign: Campaign }) {
  const copy = useCampaignCopy(campaign);

  return (
    <header className="hero">
      <TopBar copy={copy} />
      <h1>{copy.title}</h1>
      <p className="lead">{copy.lead}</p>
      <Countdown deadline={campaign.deadline} copy={copy} />
    </header>
  );
}

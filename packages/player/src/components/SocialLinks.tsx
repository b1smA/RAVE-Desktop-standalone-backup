import { openUrl } from '@tauri-apps/plugin-opener';
import { Github, Globe2, MessageCircle, Radio } from 'lucide-react';
import { FC } from 'react';

import { Button, Tooltip } from '@nuclearplayer/ui';

const SOCIAL_LINKS = [
  {
    label: 'Discord',
    icon: <MessageCircle size={16} />,
    url: 'https://discord.gg/JqPjKxE',
  },
  {
    label: 'GitHub',
    icon: <Github size={16} />,
    url: 'https://github.com/nukeop/nuclear',
  },
  {
    label: 'Mastodon',
    icon: <Radio size={16} />,
    url: 'https://fosstodon.org/@nuclearplayer',
  },
  {
    label: 'Website',
    icon: <Globe2 size={16} />,
    url: 'https://nuclearplayer.com',
  },
] as const;

export const SocialLinks: FC = () => (
  <div className="flex items-center gap-1">
    {SOCIAL_LINKS.map((link) => (
      <Tooltip key={link.label} content={link.label} side="top">
        <Button variant="text" size="icon-sm" onClick={() => openUrl(link.url)}>
          {link.icon}
        </Button>
      </Tooltip>
    ))}
  </div>
);

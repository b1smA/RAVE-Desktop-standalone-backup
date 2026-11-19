import { FC } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { SettingsPanel } from '@nuclearplayer/ui';

import { useSettingsModalStore } from '../stores/settingsModalStore';
import { useSettingsNavigation } from './useSettingsNavigation';
import { VersionString } from './VersionString';

export const ConnectedSettingsModal: FC = () => {
  const { isOpen, close } = useSettingsModalStore(
    useShallow((state) => ({ isOpen: state.isOpen, close: state.close })),
  );
  const { sections, content } = useSettingsNavigation();

  return (
    <SettingsPanel
      isOpen={isOpen}
      onClose={close}
      sections={sections}
      navigationFooter={
        <div className="flex flex-col items-center gap-2">
          <VersionString />
        </div>
      }
    >
      {content}
    </SettingsPanel>
  );
};

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { useTranslation } from '@nuclearplayer/i18n';
import { listBasicThemes } from '@nuclearplayer/themes';
import { Button, SectionShell } from '@nuclearplayer/ui';

import { useThemeStore } from '../../stores/themeStore';

export const BasicThemes = () => {
  const { t } = useTranslation('themes');
  const basicThemes = useMemo(() => listBasicThemes(), []);
  const { activeTheme, selectBasicTheme } = useThemeStore(
    useShallow((state) => ({
      activeTheme: state.activeTheme,
      selectBasicTheme: state.selectBasicTheme,
    })),
  );

  return (
    <SectionShell data-testid="basic-themes" title={t('basic')}>
      <div className="flex flex-wrap gap-4 p-1">
        {basicThemes.map((theme) => {
          const isActive =
            activeTheme.type === 'basic' && activeTheme.id === theme.id;
          return (
            <Button
              key={theme.id}
              aria-pressed={isActive}
              variant={isActive ? 'default' : 'tertiary'}
              size="flexible"
              className="flex flex-col justify-between gap-2 px-4 py-2"
              onClick={() => selectBasicTheme(theme.id)}
            >
              <span className="text-left text-base font-bold">
                {theme.name}
              </span>
              <div className="block">
                {theme.palette.map((color, idx) => (
                  <span
                    key={idx}
                    aria-hidden
                    className="ring-border inline-block size-5 rounded-full ring-2"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </Button>
          );
        })}
      </div>
    </SectionShell>
  );
};

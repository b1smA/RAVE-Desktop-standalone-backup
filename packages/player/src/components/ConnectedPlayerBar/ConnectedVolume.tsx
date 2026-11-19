import { Check, Volume2 } from 'lucide-react';
import { FC, useCallback, useEffect, useState } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { Button, PlayerBar, Popover } from '@nuclearplayer/ui';

import { useCoreSetting } from '../../hooks/useCoreSetting';

export const ConnectedVolume: FC = () => {
  const { t } = useTranslation('playerBar');
  const [volume, setVolume] = useCoreSetting<number>('playback.volume');
  const [sinkId, setSinkId] = useCoreSetting<string>(
    'playback.audioOutputDeviceId',
  );
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }
    try {
      const availableDevices = await navigator.mediaDevices.enumerateDevices();
      setDevices(
        availableDevices.filter((device) => device.kind === 'audiooutput'),
      );
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    void refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', refreshDevices);
    return () =>
      navigator.mediaDevices?.removeEventListener?.(
        'devicechange',
        refreshDevices,
      );
  }, [refreshDevices]);

  const handleVolumeChange = (value: number) => {
    setVolume(value / 100);
  };

  return (
    <PlayerBar.Volume
      value={Math.round((volume ?? 1) * 100)}
      onValueChange={handleVolumeChange}
      control={
        <Popover
          className="relative"
          anchor="top end"
          trigger={
            <Button
              size="icon"
              variant="text"
              title={t('audioOutput.title')}
              data-testid="audio-output-button"
            >
              <Volume2 size={16} />
            </Button>
          }
        >
          <Popover.Menu>
            <Popover.Item onClick={() => setSinkId('default')}>
              {t('audioOutput.systemDefault')}
              {(sinkId ?? 'default') === 'default' && <Check size={14} />}
            </Popover.Item>
            {devices.map((device, index) => (
              <Popover.Item
                key={device.deviceId}
                onClick={() => setSinkId(device.deviceId)}
              >
                {device.label || t('audioOutput.device', { number: index + 1 })}
                {sinkId === device.deviceId && <Check size={14} />}
              </Popover.Item>
            ))}
            {devices.length === 0 && (
              <div className="text-foreground/60 px-3 py-2 text-sm">
                {t('audioOutput.unavailable')}
              </div>
            )}
          </Popover.Menu>
        </Popover>
      }
    />
  );
};

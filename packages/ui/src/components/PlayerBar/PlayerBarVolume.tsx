import { Volume2 } from 'lucide-react';
import { FC, ReactNode } from 'react';

import { Button, Slider } from '..';
import { cn } from '../../utils';

type PlayerBarVolumeProps = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  disabled?: boolean;
  className?: string;
  control?: ReactNode;
};

export const PlayerBarVolume: FC<PlayerBarVolumeProps> = ({
  value,
  defaultValue,
  onValueChange,
  disabled,
  className = '',
  control,
}) => {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {control ?? (
        <Button size="icon" variant="text" disabled={disabled}>
          <Volume2 size={16} />
        </Button>
      )}
      <div className="w-24" data-testid="player-volume-slider">
        <Slider
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          disabled={disabled}
          showValue={false}
          showFooter={false}
        />
      </div>
    </div>
  );
};

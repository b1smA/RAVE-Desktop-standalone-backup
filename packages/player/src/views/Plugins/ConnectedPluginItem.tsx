import { FC } from 'react';

import { useTranslation } from '@nuclearplayer/i18n';
import { PluginItem, Toggle } from '@nuclearplayer/ui';

import { PluginIconComponent } from '../../components/PluginIcon';
import { PluginState, usePluginStore } from '../../stores/pluginStore';
import { useStartupStore } from '../../stores/startupStore';

type ConnectedPluginItemProps = {
  plugin: PluginState;
};

export const ConnectedPluginItem: FC<ConnectedPluginItemProps> = ({
  plugin,
}) => {
  const { t } = useTranslation('plugins');
  const loadTimeMs = useStartupStore(
    (state) => state.pluginDurations[plugin.metadata.id],
  );

  const handleReload = async () => {
    if (plugin.installationMethod === 'dev') {
      await usePluginStore.getState().reloadPlugin(plugin.metadata.id);
    }
  };

  const handleRemove = async () => {
    await usePluginStore.getState().removePlugin(plugin.metadata.id);
  };

  const handleToggle = (checked: boolean) =>
    checked
      ? usePluginStore.getState().enablePlugin(plugin.metadata.id)
      : usePluginStore.getState().disablePlugin(plugin.metadata.id);

  return (
    <PluginItem
      icon={<PluginIconComponent icon={plugin.metadata.icon} />}
      name={plugin.metadata.displayName}
      author={plugin.metadata.author}
      description={plugin.metadata.description}
      version={plugin.metadata.version}
      disabled={!plugin.enabled}
      warning={plugin.warning}
      warningText={plugin.warnings.length > 0 ? plugin.warnings[0] : undefined}
      isLoading={plugin.isLoading}
      onReload={handleReload}
      onRemove={handleRemove}
      rightAccessory={
        <Toggle
          data-testid={`toggle-enable-plugin-${plugin.metadata.id}`}
          data-enabled={plugin.enabled}
          checked={plugin.enabled}
          onChange={handleToggle}
          aria-label={`Toggle ${plugin.metadata.displayName}`}
        />
      }
      loadTimeMs={loadTimeMs}
      labels={{
        by: t('installed.by'),
        updateAvailable: t('installed.update-available'),
      }}
    />
  );
};

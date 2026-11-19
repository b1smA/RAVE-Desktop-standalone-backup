import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FC } from 'react';

import RemoteControl from './RemoteControl';
import { SessionGate } from './sessions/SessionGate';

const defaultQueryClient = new QueryClient();

type RemoteAppProps = {
  queryClientProp?: QueryClient;
};

const RemoteApp: FC<RemoteAppProps> = ({ queryClientProp }) => {
  const remoteControl = <RemoteControl />;
  const sessionEnabled =
    new URLSearchParams(window.location.search).get('session') === '1';
  return (
    <QueryClientProvider client={queryClientProp ?? defaultQueryClient}>
      {sessionEnabled ? (
        <SessionGate>{remoteControl}</SessionGate>
      ) : (
        remoteControl
      )}
    </QueryClientProvider>
  );
};

export default RemoteApp;

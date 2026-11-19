const TOKEN_KEY = 'rave-session-token';

export type SessionPermissions = {
  canAddTracks: boolean;
  canVote: boolean;
  canControlPlayback: boolean;
  canManageQueue: boolean;
};

export type SessionSnapshot = {
  active: boolean;
  permissions: SessionPermissions;
  participants: { id: string; name: string; joinedAt: number }[];
  votes: Record<string, number>;
  activity: {
    id: string;
    participantName: string;
    action: string;
    createdAt: number;
  }[];
};

export const getSessionToken = () => sessionStorage.getItem(TOKEN_KEY);

export const setSessionToken = (token: string) =>
  sessionStorage.setItem(TOKEN_KEY, token);

export const clearSessionToken = () => sessionStorage.removeItem(TOKEN_KEY);

export const sessionFetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const token = getSessionToken();
  if (!token) {
    return fetch(input, init);
  }
  const headers = new Headers(init?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
};

export const sessionEventUrl = (path: string) => {
  const token = getSessionToken();
  return token ? `${path}?token=${encodeURIComponent(token)}` : path;
};

import { create } from 'zustand';

type MiniPlayerState = {
  active: boolean;
  setActive: (active: boolean) => void;
};

export const useMiniPlayerStore = create<MiniPlayerState>((set) => ({
  active: false,
  setActive: (active) => set({ active }),
}));

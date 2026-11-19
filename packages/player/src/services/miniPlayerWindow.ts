import { LogicalSize, PhysicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';

import { useMiniPlayerStore } from '../stores/miniPlayerStore';
import { errorMessage } from '../utils/errorMessage';
import { Logger } from './logger';

const MINI_PLAYER_WIDTH = 420;
const MINI_PLAYER_HEIGHT = 64;
let previousSize: PhysicalSize | undefined;
let previousDecorated: boolean | undefined;

export const enterMiniPlayer = async (): Promise<void> => {
  const window = getCurrentWindow();
  try {
    previousSize = await window.outerSize();
    previousDecorated = await window.isDecorated();
    await window.setAlwaysOnTop(true);
    await window.setDecorations(false);
    await window.setSize(
      new LogicalSize(MINI_PLAYER_WIDTH, MINI_PLAYER_HEIGHT),
    );
    await window.setResizable(false);
    useMiniPlayerStore.getState().setActive(true);
  } catch (error) {
    Logger.app.error(`Failed to enter mini player: ${errorMessage(error)}`);
  }
};

export const exitMiniPlayer = async (): Promise<void> => {
  const window = getCurrentWindow();
  try {
    await window.setResizable(true);
    await window.setAlwaysOnTop(false);
    if (previousDecorated !== undefined) {
      await window.setDecorations(previousDecorated);
    }
    if (previousSize) {
      await window.setSize(previousSize);
    }
    useMiniPlayerStore.getState().setActive(false);
  } catch (error) {
    Logger.app.error(`Failed to exit mini player: ${errorMessage(error)}`);
  }
};

export const minimizeMiniPlayer = async (): Promise<void> => {
  await getCurrentWindow().minimize();
};

export const closeMiniPlayer = async (): Promise<void> => {
  await getCurrentWindow().close();
};

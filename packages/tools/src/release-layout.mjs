export const releaseLayout = (version) => [
  {
    artifact: 'macos-aarch64',
    path: `dmg/RAVE_${version}_aarch64.dmg`,
  },
  {
    artifact: 'macos-aarch64',
    path: 'macos/RAVE.app.tar.gz',
    name: `RAVE_${version}_aarch64.app.tar.gz`,
    updaterPlatforms: ['darwin-aarch64', 'darwin-aarch64-app'],
  },
  {
    artifact: 'macos-x64',
    path: `dmg/RAVE_${version}_x64.dmg`,
  },
  {
    artifact: 'macos-x64',
    path: 'macos/RAVE.app.tar.gz',
    name: `RAVE_${version}_x64.app.tar.gz`,
    updaterPlatforms: ['darwin-x86_64', 'darwin-x86_64-app'],
  },
  {
    artifact: 'linux-x64',
    path: `appimage/RAVE_${version}_amd64.AppImage`,
    updaterPlatforms: ['linux-x86_64', 'linux-x86_64-appimage'],
  },
  {
    artifact: 'linux-x64',
    path: `deb/RAVE_${version}_amd64.deb`,
    updaterPlatforms: ['linux-x86_64-deb'],
  },
  {
    artifact: 'linux-x64',
    path: `rpm/RAVE-${version}-1.x86_64.rpm`,
    updaterPlatforms: ['linux-x86_64-rpm'],
  },
  {
    artifact: 'windows-x64',
    path: `msi/RAVE_${version}_x64_en-US.msi`,
    updaterPlatforms: ['windows-x86_64', 'windows-x86_64-msi'],
  },
  {
    artifact: 'windows-x64',
    path: `nsis/RAVE_${version}_x64-setup.exe`,
    updaterPlatforms: ['windows-x86_64-nsis'],
  },
  {
    artifact: `RAVE_${version}_x86_64-x86_64.flatpak`,
    path: `RAVE_${version}_x86_64.flatpak`,
  },
  {
    artifact: 'snap',
    path: `rave-player_${version}_amd64.snap`,
  },
];

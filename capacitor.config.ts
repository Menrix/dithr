import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.redphx.dithr',
  appName: 'DITHR',
  webDir: 'build',
  plugins: {
    Media: {
      androidGalleryMode: false,
    },
  },
};

export default config;

import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cl.policircular.castro',
  appName: 'PoliCircular',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#0B1E33',
    allowMixedContent: false,
  },
};

export default config;

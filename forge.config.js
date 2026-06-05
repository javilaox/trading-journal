const path = require('path');
const dotenv = require('dotenv');
const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

/**
 * Selección del entorno (.env.staging | .env.production) según APP_BUILD_ENV.
 * Si no se especifica, por seguridad se usa staging por defecto.
 */
const buildEnv =
  process.env.APP_BUILD_ENV === 'production' ? 'production' : 'staging';
const envFile = buildEnv === 'production' ? '.env.production' : '.env.staging';

const dotenvResult = dotenv.config({
  path: path.resolve(__dirname, envFile),
});

if (dotenvResult.error) {
  console.warn(
    `[forge.config] No se pudo cargar ${envFile}:`,
    dotenvResult.error.message
  );
} else {
  console.log(`[forge.config] Entorno cargado: ${buildEnv} (${envFile})`);
}

if (!process.env.APP_ENV) {
  process.env.APP_ENV = buildEnv;
}

const APP_ICON = path.resolve(__dirname, 'src/assets/jlx-app-icon.ico');
const SQUIRREL_EXE = 'TradingJournal.exe';
/** ID Squirrel (sin / ni -). Carpeta de instalación: %LOCALAPPDATA%\\TradingJournal */
const SQUIRREL_APP_ID = 'TradingJournal';

/** CSP dev server (@electron-forge/plugin-webpack); debe incluir connect-src para Supabase */
const DEV_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net https://unpkg.com",
].join('; ');

module.exports = {
  packagerConfig: {
    asar: true,
    icon: './src/assets/jlx-app-icon',
    executableName: 'TradingJournal',
    extraResource: [APP_ICON],
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
      config: {
        name: SQUIRREL_APP_ID,
        title: 'Trading Journal',
        authors: 'Javier Lao',
        exe: SQUIRREL_EXE,
        setupExe: 'Trading Journal Setup.exe',
        setupIcon: APP_ICON,
        description:
          'Diario de trading personal con sincronización Supabase y modo offline-first.',
        noMsi: true,
        skipUpdateIcon: process.platform !== 'win32',
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        devContentSecurityPolicy: DEV_CSP,
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/dashboard.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
            {
              html: './src/stats.html',
              js: './src/stats.js',
              name: 'stats',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

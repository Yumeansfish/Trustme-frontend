interface InjectedAppConfig {
  production?: boolean;
  awServerUrl?: string;
}

const injectedConfig: InjectedAppConfig =
  typeof __TRUSTME_APP_CONFIG__ === 'undefined' ? {} : __TRUSTME_APP_CONFIG__;

export const appConfig = {
  production: injectedConfig.production === true,
  awServerUrl: injectedConfig.awServerUrl || '',
};

export const isProductionBuild = appConfig.production;
export const isTestRuntime =
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';

const config = {};

export function setConfig(argv) {
  Object.assign(config, argv);
}

export function getConfig() {
  return config;
}

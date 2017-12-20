import packageJson from '../package.json';

export const DEFAULT_BASE_BRANCHES = ['develop', 'master'];
export const INQUIRER_PAGE_SIZE = 8;
export const COMMITS_PAGE_SIZE = 5;
export const GAPI_TOKEN_DIR = `${process.env.HOME ||
  process.env.HOMEPATH ||
  process.env.USERPROFILE}/.credentials/`;
export const GAPI_TOKEN_PATH = `${GAPI_TOKEN_DIR}googleapis-branch-cleanup-${
  packageJson.version
}.json`;

export const DEFAULT_CLIENT_SECRET_PATHS = [
  './google_client_secret.json',
  `${GAPI_TOKEN_DIR}google_client_secret.json`,
];
export const GAPI_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];
export const COLOR_HIDDEN_COLUMN = {
  red: 0.847,
  green: 0.184,
  blue: 0.659,
  alpha: 1,
};
export const COLOR_BORDER_DARK = {
  red: 0.4,
  green: 0.4,
  blue: 0.4,
  alpha: 1,
};
export const COLOR_BORDER_LIGHT = {
  red: 0.8,
  green: 0.8,
  blue: 0.8,
  alpha: 1,
};
export const SHEET_COL_SIZE = {
  HIDDEN: 5,
  S: 60,
  M: 150,
  L: 300,
};
export const NUM_COMMITS_IN_SHEET = 16;

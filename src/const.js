import packageJson from '../package.json';

export const DEFAULT_BASE_BRANCHES = ['develop', 'master'];
export const INQUIRER_PAGE_SIZE = 8;
export const COMMITS_PAGE_SIZE = 5;
export const DEFAULT_CLIENT_SECRET_PATH = './google_client_secret.json';
export const GAPI_TOKEN_DIR = `${process.env.HOME ||
  process.env.HOMEPATH ||
  process.env.USERPROFILE}/.credentials/'`;
export const GAPI_TOKEN_PATH = `${GAPI_TOKEN_DIR}googleapis-branch-cleanup-${
  packageJson.version
}.json`;
export const GAPI_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];
export const COLOR_HIDDEN_COLUMN = {
  red: .847,
  green: .184,
  blue: .659,
  alpha: 1,
};

import opn from 'opn';
import google from 'googleapis';
import GoogleAuth from 'google-auth-library';
import promisify from 'es6-promisify';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import {
  DEFAULT_CLIENT_SECRET_PATHS,
  GAPI_SCOPES,
  GAPI_TOKEN_DIR,
  GAPI_TOKEN_PATH,
} from '../const';

let oauth2Client;
const readFile = promisify(fs.readFile, fs);
const writeFile = promisify(fs.writeFile, fs);

async function promptCredentialsPath() {
  const { clientSecretPath } = await inquirer.prompt([
    {
      name: 'clientSecretPath',
      message: '[review remote] enter path: ',
    },
  ]);

  // eslint-disable-next-line no-use-before-define
  return getCredentials(clientSecretPath);
}

async function getCredentials(clientSecretPath = null) {
  const readPaths = clientSecretPath ? [clientSecretPath] : DEFAULT_CLIENT_SECRET_PATHS;

  // eslint-disable-next-line no-restricted-syntax
  for (const readPath of readPaths) {
    const resolvedPath = path.resolve(readPath);
    if (fs.existsSync(resolvedPath)) {
      console.log(`client secret for google api found at ${readPath}`);
      // eslint-disable-next-line no-await-in-loop
      const clientSecretFile = await readFile(resolvedPath, { encoding: 'utf8' });

      try {
        return JSON.parse(clientSecretFile);
      } catch (e) {
        console.log('Problem parsing client secret json');
      }
    }
  }

  const { action } = await inquirer.prompt([
    {
      name: 'action',
      message: '[review remote] how would you like to provide the google api client secret?',
      type: 'list',
      choices: [
        {
          name: `enter a path to the json file`,
          value: () => promptCredentialsPath(clientSecretPath),
        },
        ...DEFAULT_CLIENT_SECRET_PATHS.map(defaultPath => ({
          name: `try again to read json file from ${defaultPath}`,
          value: () => getCredentials(defaultPath),
        })),
        {
          name: 'return to main menu',
          value: () => null,
        },
      ],
    },
  ]);

  return action();
}

async function storeToken(token) {
  try {
    fs.mkdirSync(GAPI_TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  await writeFile(GAPI_TOKEN_PATH, JSON.stringify(token));
  console.log(`Token stored to ${GAPI_TOKEN_PATH}`);
  return token;
}

async function getNewToken() {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: GAPI_SCOPES,
  });

  console.log(`Opening ${authUrl}...`);
  console.log('if opening url fails, please copy the url into your browser of choice');
  opn(authUrl, { wait: false });

  const { code } = await inquirer.prompt([
    {
      name: 'code',
      message: '[review remote] Please enter the code retrieved by logging in here',
    },
  ]);

  const getToken = promisify(oauth2Client.getToken, oauth2Client);
  let token;
  try {
    token = await getToken(code);
  } catch (e) {
    console.log('something went wrong. please try again');
    token = await getNewToken(oauth2Client);
  }

  await storeToken(token);
  return token;
}

async function getGapiToken() {
  try {
    const tokenFile = await readFile(GAPI_TOKEN_PATH, { encoding: 'utf8' });
    return JSON.parse(tokenFile);
  } catch (e) {
    // ignore
  }

  return getNewToken();
}

export async function authenticate() {
  const credentials = await getCredentials();

  if (!credentials) {
    return false;
  }

  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new GoogleAuth();
  oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
  const token = await getGapiToken();
  if (!token) {
    return false;
  }
  oauth2Client.credentials = token;

  return true;
}

export async function createSheet(sheetData, title) {
  const sheets = google.sheets('v4');
  const createSpreadsheet = promisify(sheets.spreadsheets.create, sheets.spreadsheets);

  let response;
  try {
    response = await createSpreadsheet({
      resource: {
        properties: {
          title,
        },
        sheets: [sheetData],
      },
      auth: oauth2Client,
    });
    return response;
  } catch (e) {
    console.error(e);
    return false;
  }
}

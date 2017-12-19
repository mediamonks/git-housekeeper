import opn from 'opn';
import google from 'googleapis';
import GoogleAuth from 'google-auth-library';
import promisify from 'es6-promisify';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { DEFAULT_CLIENT_SECRET_PATH, GAPI_SCOPES, GAPI_TOKEN_DIR, GAPI_TOKEN_PATH } from '../const';

const readFile = promisify(fs.readFile, fs);
const writeFile = promisify(fs.writeFile, fs);

async function promptCredentialsPath() {
  const { clientSecretPath } = await inquirer.prompt([
    {
      name: 'clientSecretPath',
      message: 'enter path: ',
    },
  ]);

  // eslint-disable-next-line no-use-before-define
  return getCredentials(clientSecretPath);
}

async function getCredentials(clientSecretPath = DEFAULT_CLIENT_SECRET_PATH) {
  const resolvedPath = path.resolve(clientSecretPath);
  if (fs.existsSync(resolvedPath)) {
    console.log(`client secret for google api found at ${clientSecretPath}`);
    const clientSecretFile = await readFile(resolvedPath, { encoding: 'utf8' });

    try {
      return JSON.parse(clientSecretFile);
    } catch (e) {
      console.log('Problem parsing client secret json');
    }
  }

  const { action } = await inquirer.prompt([
    {
      name: 'action',
      message: 'how would you like to provide the google api client secret?',
      type: 'list',
      choices: [
        {
          name: `enter a path to the json file`,
          value: () => promptCredentialsPath(clientSecretPath),
        },
        {
          name: `try again to read json file from ${clientSecretPath}`,
          value: () => getCredentials(clientSecretPath),
        },
        {
          name: 'exit',
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

async function getNewToken(oauth2Client) {
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
      message: 'Please enter the code retrieved by logging in here',
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

async function getGapiToken(oauth2Client) {
  try {
    const tokenFile = await readFile(GAPI_TOKEN_PATH, { encoding: 'utf8' });
    return JSON.parse(tokenFile);
  } catch (e) {
    // ignore
  }

  return getNewToken(oauth2Client);
}

export async function authenticate() {
  const credentials = await getCredentials();

  if (!credentials) {
    return null;
  }

  const clientSecret = credentials.installed.client_secret;
  const clientId = credentials.installed.client_id;
  const redirectUrl = credentials.installed.redirect_uris[0];
  const auth = new GoogleAuth();
  const oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);
  const token = await getGapiToken(oauth2Client);
  oauth2Client.credentials = token;

  return oauth2Client;
}

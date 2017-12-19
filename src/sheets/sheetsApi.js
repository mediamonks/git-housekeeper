import google from 'googleapis';
import GoogleAuth from 'google-auth-library';
import promisify from 'es6-promisify';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { DEFAULT_CLIENT_SECRET_PATH } from '../const';

const readFile = promisify(fs.readFile, fs);

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
  console.log(credentials);
}

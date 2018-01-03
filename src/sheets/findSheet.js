import fs from 'fs';
import promisify from 'es6-promisify';
import inquirer from 'inquirer';
import request from 'request-promise-native';
import opn from 'opn';
import { API_ROOT_URL, API_TOKEN_PATH, TOKEN_DIR } from '../const';
import { findSheetId } from './sheetsApi';
import processSheet from './processSheet';

const readFile = promisify(fs.readFile, fs);
const writeFile = promisify(fs.writeFile, fs);

async function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err;
    }
  }
  await writeFile(API_TOKEN_PATH, JSON.stringify(token));
  console.log(`Token stored to ${API_TOKEN_PATH}`);
  return token;
}

async function tryGetExternalApiToken() {
  try {
    const tokenFile = await readFile(API_TOKEN_PATH, { encoding: 'utf8' });
    return JSON.parse(tokenFile);
  } catch (e) {
    return null;
  }
}

async function authenticate() {
  try {
    const tokenFile = await readFile(API_TOKEN_PATH, { encoding: 'utf8' });
    return JSON.parse(tokenFile);
  } catch (e) {
    // ignore
  }

  console.log(
    'Please open the following url in your browser, log in with your Google account\n' +
      'and copy the code from that page here.',
  );
  const authUrl = `${API_ROOT_URL}authenticate/connect`;
  console.log(`\n${authUrl}\n`);
  await opn(authUrl);

  const { code } = await inquirer.prompt([
    {
      name: 'code',
      message: '[review remote] Please enter the code retrieved by logging in here',
    },
  ]);

  let token;

  try {
    token = await request({
      uri: `${API_ROOT_URL}authenticate/token`,
      json: true,
      method: 'POST',
      body: {
        code,
      },
    });
  } catch (e) {
    console.log('\nCould not retrieve access token. Please try again.\n\n');
    return authenticate();
  }

  await storeToken(token);

  return token;
}

async function findSheetLocal(argv) {
  const authenticated = await authenticate();
  if (!authenticated) {
    return true;
  }

  const sheetId = await findSheetId();

  if (!sheetId) {
    console.log('\n\nBye!\n\n');
    process.exit();
  }

  return processSheet(argv, sheetId);
}

async function findSheetExternal(argv, token) {
  console.log(token);
}

async function promptExternalApi(argv) {
  console.log('\n---- IMPORTANT ----\n');

  console.log(
    'In order to process Google Sheets, git-housekeeper hosts an API that\n' +
      'calls the Google API with the meta information of the branches in your repository.\n' +
      'Branch names, author names, remote urls and commit messages and dates will be sent to this \n' +
      'API. This data will be used solely for generating the Google Sheet and will not be\n' +
      'stored on our servers.',
  );
  console.log(
    'If you would rather not share repository information with our API, you have the\n' +
      'option to use to the Google API directly. Please consult the README for more information.',
  );

  console.log('\n------------------\n');

  const { action } = await inquirer.prompt([
    {
      name: 'action',
      message: '[review remote] Would you like to use the API?',
      type: 'list',
      choices: [
        {
          name: 'yes (recommended)',
          value: () => authenticate().then(token => findSheetExternal(argv, token)),
        },
        {
          name:
            "no, I'd rather use the Google API directly (requires setting up an OAuth client ID)",
          value: () => findSheetLocal(argv),
        },
      ],
    },
  ]);

  return action();
}

async function findSheet(argv) {
  console.log('\n\nWelcome back!\n\n');

  const externalApiToken = await tryGetExternalApiToken();

  if (!externalApiToken) {
    return promptExternalApi(argv);
  }

  return findSheetExternal(argv, externalApiToken);
}

export default findSheet;

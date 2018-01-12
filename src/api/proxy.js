import inquirer from 'inquirer';
import fs from 'fs';
import request from 'request-promise-native';
import promisify from 'es6-promisify';
import opn from 'opn';
import sheetResultMenu from '../flows/sheetResultMenu';
import { API_ROOT_URL, API_TOKEN_PATH, TOKEN_DIR } from '../const';

const readFile = promisify(fs.readFile, fs);
const writeFile = promisify(fs.writeFile, fs);
let encryptedToken;

export function logDisclaimer() {
  console.log('\n---- IMPORTANT ----\n');

  console.log(
    'In order to easily generate Google Sheets, git-housekeeper hosts an API that\n' +
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
}

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
  encryptedToken = token;
  return token;
}

export async function authenticate() {
  try {
    const tokenFile = await readFile(API_TOKEN_PATH, { encoding: 'utf8' });
    encryptedToken = JSON.parse(tokenFile);
    return encryptedToken;
  } catch (e) {
    // ignore
  }

  console.log(
    'Please open the following url in your browser, log in with your Google account\n' +
      'and copy the code from that page here.',
  );
  const authUrl = `${API_ROOT_URL}authenticate/connect`;
  console.log(`\n${authUrl}\n`);
  await opn(authUrl, { wait: false });

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

  return true;
}

export async function createSheet({ branches, baseBranch, remote }) {
  if (!encryptedToken) {
    throw new Error('Should authenticate before running createSheet()');
  }

  let response;
  try {
    response = await request({
      uri: `${API_ROOT_URL}sheets`,
      method: 'POST',
      json: true,
      body: {
        branches,
        baseBranch,
        remote,
        ...encryptedToken,
      },
    });
    return response;
  } catch (e) {
    console.error(e);
    return false;
  }
}

export async function findSheet(searchAll = false) {
  if (!encryptedToken) {
    throw new Error('Should authenticate before running findSheet()');
  }

  const response = await request({
    uri: `${API_ROOT_URL}sheets`,
    method: 'GET',
    json: true,
    qs: {
      ...encryptedToken,
      searchAll: searchAll ? 1 : 0,
    },
  });
  let sheetId = null;
  if (response.files.length) {
    ({ sheetId } = await inquirer.prompt([
      {
        name: 'sheetId',
        message: 'Please select the Google Sheet you would like to process',
        type: 'list',
        choices: [
          ...response.files.map(({ name, id }) => ({
            value: id,
            name,
          })),
          {
            value: null,
            name: searchAll ? '<exit>' : 'find more files...',
          },
        ],
      },
    ]));
  }

  if (!sheetId) {
    return searchAll ? null : findSheet(true);
  }

  return sheetId;
}

export async function processSheet(spreadsheetId) {
  if (!encryptedToken) {
    throw new Error('Should authenticate before running processSheet()');
  }

  console.log(`getting data from sheet ${spreadsheetId}`);
  const response = await request({
    uri: `${API_ROOT_URL}sheets/${spreadsheetId}`,
    method: 'GET',
    json: true,
    qs: {
      ...encryptedToken,
    },
  });

  return sheetResultMenu(response);
}

import fs from 'fs';
import path from 'path';
import promisify from 'es6-promisify';
import inquirer from 'inquirer';
import request from 'request-promise-native';
import opn from 'opn';
import { deleteBranch, fetchRemote, getBranches, openRepository, setRemote } from '../git';
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

async function findSheetExternal(argv, token, searchAll = false) {
  const response = await request({
    uri: `${API_ROOT_URL}sheets`,
    method: 'GET',
    json: true,
    qs: {
      ...token,
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
    return searchAll ? null : findSheetExternal(argv, token, true);
  }

  return sheetId;
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

async function promptConfirmRemoveBranches(dryRun) {
  const { response } = await inquirer.prompt([
    {
      name: 'response',
      message: `[review remote] Are you sure? ${dryRun ? '(dry run)' : 'THIS CANNOT BE UNDONE!'}`,
      type: 'confirm',
    },
  ]);

  return response;
}

async function processSheetExternal(argv, { meta, branches: branchRows }) {
  const repositoryPath = path.resolve(argv.path);
  await openRepository(repositoryPath);
  await setRemote(meta.remote, meta.url);
  await fetchRemote();
  const branches = await getBranches();
  const noActionRows = [];
  const keepRows = [];
  const deleteRows = [];

  // eslint-disable-next-line no-restricted-syntax
  for (const row of branchRows) {
    const action = row.action && row.action.stringValue;
    const branchRef = row.hidden.stringValue;
    switch (action) {
      case 'KEEP':
        keepRows.push(branchRef);
        break;
      case 'DELETE':
        deleteRows.push(branchRef);
        break;
      default:
        noActionRows.push(branchRef);
    }
  }

  console.log(`\n\nrepository path: ${repositoryPath}`);
  console.log(`remote: ${meta.remote}`);
  console.log(`url: ${meta.url}`);
  if (keepRows.length) {
    console.log(`${keepRows.length} branches marked to keep`);
  }
  if (noActionRows.length) {
    console.log(`${noActionRows.length} branches with no action specified`);
  }
  if (deleteRows.length) {
    console.log(`${deleteRows.length} branches marked for removal`);
  }

  if (!deleteRows.length) {
    console.log('\n\nnothing to do here. Bye!');
    return false;
  }

  const deleteBranches = [];
  const goneBranches = [];
  const changedBranches = [];

  await Promise.all(
    deleteRows.map(async ref => {
      const [branchRef, headSha] = ref.split(':');
      const branch = branches.remotes.find(remoteBranch => remoteBranch.name === branchRef);
      if (branch) {
        deleteBranches.push(branch);

        if (branch.head.sha() !== headSha) {
          changedBranches.push(branch);
        }
      } else {
        goneBranches.push(branchRef);
      }
    }),
  );

  if (goneBranches.length) {
    console.log(`\nthe following branches in the sheet are no longer found on ${meta.remote}:`);
    goneBranches.forEach(ref => console.log(` - ${ref}`));
    console.log('these branches will be ignored\n');
  }

  if (changedBranches.length) {
    console.warn(
      `\nWARNING: the following branches have changed on remote "${
        meta.remote
      }" since the sheet was generated:`,
    );
    changedBranches.forEach(branch => console.warn(` - ${branch.shortName}`));
  }

  if (!deleteBranches.length) {
    console.log('nothing to do here. Bye!');
    return false;
  }

  console.log(`\nthe following branches will be deleted on ${meta.remote}:`);
  deleteBranches.forEach(branch => console.log(` - ${branch.shortName}`));

  if (await promptConfirmRemoveBranches(argv.d)) {
    // eslint-disable-next-line no-restricted-syntax
    for (const branch of deleteBranches) {
      if (!branch) {
        console.warn(`Could not find branch: ${branch}`);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await deleteBranch(branch.ref, argv.d, true);
      }
    }
  }

  return false;
}

export async function getSheetAndProcess(argv, externalApiToken, sheetId) {
  const response = await request({
    uri: `${API_ROOT_URL}sheets/${sheetId}`,
    method: 'GET',
    json: true,
    qs: {
      ...externalApiToken,
    },
  });

  return processSheetExternal(argv, response);
}

async function findSheet(argv) {
  console.log('\n\nWelcome back!\n\n');

  const externalApiToken = await tryGetExternalApiToken();

  if (!externalApiToken) {
    return promptExternalApi(argv);
  }

  const sheetId = await findSheetExternal(argv, externalApiToken);

  if (!sheetId) {
    console.log('\n\nBye!\n\n');
    process.exit();
  }

  return getSheetAndProcess(argv, externalApiToken, sheetId);
}

export default findSheet;

import opn from 'opn';
import promisify from 'es6-promisify';
import fs from 'fs';
import ProgressBar from 'progress';
import inquirer from 'inquirer';
import request from 'request-promise-native';
import { reviewGoogleSheetsLocal } from './reviewRemoteGoogleSheetsLocal';
import {
  API_ROOT_URL,
  TOKEN_DIR,
  API_TOKEN_PATH,
  DEFAULT_BASE_BRANCHES,
  NUM_COMMITS_IN_SHEET,
} from '../const';
import { getBranchAheadBehind, getTargetRemote } from '../git';

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

async function reviewExternal(
  argv,
  remoteBranches,
  baseBranch,
  commitsInBase,
  includeCommitMessages,
) {
  const token = await authenticate();
  if (!token) {
    return true;
  }

  const branches = remoteBranches
    .filter(
      branch =>
        !(
          DEFAULT_BASE_BRANCHES.some(branchName => branch.name.endsWith(branchName)) ||
          branch.name.endsWith(baseBranch)
        ),
    )
    .slice(0, 8);

  console.log('reading commits on remote branches...');

  const shaInBase = commitsInBase.map(commit => commit.sha());
  const progressBar = new ProgressBar(':bar', { total: branches.length });

  const branchCommits = await Promise.all(
    branches.map(async branch => {
      const commits = await getBranchAheadBehind(branch.ref, shaInBase);

      progressBar.tick();
      return {
        ahead: commits.ahead.slice(0, NUM_COMMITS_IN_SHEET).map(commit => ({
          sha: commit.sha().substring(0, 6),
          author: commit.author().name(),
          time: commit.timeMs(),
          ...(includeCommitMessages ? { summary: commit.summary() } : {}),
        })),
        headSha: branch.head.sha(),
        numAhead: commits.ahead.length,
        numBehind: commits.behind.length,
      };
    }),
  );

  progressBar.terminate();

  const response = await request({
    uri: `${API_ROOT_URL}sheet`,
    method: 'POST',
    json: true,
    body: {
      branches: branches.map((branch, index) => ({
        shortName: branch.shortName,
        name: branch.name,
        commits: branchCommits[index],
      })),
      ...token,
      baseBranch,
      remote: {
        name: getTargetRemote().name(),
        url: getTargetRemote().url(),
      },
    },
  });
  console.log(response);

  return includeCommitMessages;
}

async function reviewGoogleSheets(argv, remoteBranches, baseBranch, commitsInBase) {
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

  const { action } = await inquirer.prompt([
    {
      name: 'action',
      message: '[review remote] Would you like to use the API?',
      type: 'list',
      choices: [
        {
          name: 'yes (recommended)',
          value: () => reviewExternal(argv, remoteBranches, baseBranch, commitsInBase, true),
        },
        {
          name: 'yes, but exclude commit messages',
          value: () => reviewExternal(argv, remoteBranches, baseBranch, commitsInBase, false),
        },
        {
          name:
            "no, I'd rather use the Google API directly (requires setting up an OAuth client ID)",
          value: () => reviewGoogleSheetsLocal(argv, remoteBranches, baseBranch, commitsInBase),
        },
      ],
    },
  ]);

  return action();
}

export default reviewGoogleSheets;

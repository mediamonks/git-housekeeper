import inquirer from 'inquirer';
import opn from 'opn';
import ProgressBar from 'progress';
import packageJson from '../../package.json';
import * as googleApi from '../api/google';
import * as proxyApi from '../api/proxy';
import { getAllCommitsInBranch, getBranches, getBranchAheadBehind } from '../git/branches';
import { getReferenceFromTargetRemote, getTargetRemote } from '../git/remote';
import { DEFAULT_BASE_BRANCHES, NUM_COMMITS_IN_SHEET, PROCESS_SHEET_COMMAND } from '../const';

const REVIEW_DIRECT = 0;
const REVIEW_PROXY = 1;
const REVIEW_PROXY_NO_COMMITS = 2;

async function promptApiUsage() {
  proxyApi.logDisclaimer();

  const { apiUsage } = await inquirer.prompt([
    {
      name: 'apiUsage',
      message: '[review remote] Would you like to use the API?',
      type: 'list',
      choices: [
        {
          name: 'yes (recommended)',
          value: REVIEW_PROXY,
        },
        {
          name: 'yes, but exclude commit messages',
          value: REVIEW_PROXY_NO_COMMITS,
        },
        {
          name:
            "no, I'd rather use the Google API directly (requires setting up an OAuth client ID)",
          value: REVIEW_DIRECT,
        },
      ],
    },
  ]);

  return apiUsage;
}

async function sheetGeneratedMenu(response, api, baseBranch) {
  const { action } = await inquirer.prompt([
    {
      name: 'action',
      message: '[review remote] What would you like to do now?',
      type: 'list',
      choices: [
        {
          name: 'open the sheet url again',
          value: () => {
            opn(response.spreadsheetUrl, { wait: false });
            return sheetGeneratedMenu(response, api, baseBranch);
          },
        },
        {
          name: 'the sheet has been filled, process it now',
          value: () => api.processSheet(response.spreadsheetId, api),
        },
        {
          name: 'exit git-housekeeper and come back to process the sheet later',
          value: () => {
            console.log(
              `to complete the review, run the following command:\n${
                packageJson.name
              } ${PROCESS_SHEET_COMMAND} <repository path>`,
            );
          },
        },
      ],
    },
  ]);

  return action();
}

async function reviewRemoteGoogleSheets(baseBranch) {
  const apiChoice = await promptApiUsage();
  const api = apiChoice === REVIEW_DIRECT ? googleApi : proxyApi;
  const includeCommitMessages = apiChoice !== REVIEW_PROXY_NO_COMMITS;

  const authenticated = await api.authenticate();
  if (!authenticated) {
    return false;
  }

  const branches = await getBranches();
  const commitsInBase = await getAllCommitsInBranch(await getReferenceFromTargetRemote(baseBranch));

  const branchesToReview = branches.remotes.filter(
    branch =>
      !(
        DEFAULT_BASE_BRANCHES.some(branchName => branch.name.endsWith(branchName)) ||
        branch.name.endsWith(baseBranch)
      ) && branch.onTargetRemote,
  );

  console.log('reading commits on remote branches...');

  const shaInBase = commitsInBase.map(commit => commit.sha());
  const progressBar = new ProgressBar(':bar', { total: branchesToReview.length });

  const branchCommits = await Promise.all(
    branchesToReview.map(async branch => {
      const commits = await getBranchAheadBehind(branch.ref, shaInBase);

      progressBar.tick();
      return {
        ahead: commits.ahead.slice(0, NUM_COMMITS_IN_SHEET).map(commit => ({
          sha: commit.sha().substring(0, 6),
          author: commit.author().name(),
          time: commit.timeMs(),
          ...(includeCommitMessages ? { summary: commit.summary() } : {}),
        })),
        numAhead: commits.ahead.length,
        numBehind: commits.behind.length,
      };
    }),
  );

  progressBar.terminate();

  const targetRemote = await getTargetRemote();
  const formattedBranchData = {
    branches: branchesToReview.map((branch, index) => ({
      shortName: branch.shortName,
      name: branch.name,
      headSha: branch.head.sha(),
      commits: branchCommits[index],
    })),
    baseBranch,
    remote: {
      name: targetRemote.name(),
      url: targetRemote.url(),
    },
  };

  const response = await api.createSheet(formattedBranchData);
  opn(response.spreadsheetUrl, { wait: false });
  return sheetGeneratedMenu(response, api, baseBranch);
}

export default reviewRemoteGoogleSheets;

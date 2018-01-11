import os from 'os';
import inquirer from 'inquirer';
import { Cred, Remote } from 'nodegit';
import { getRepository } from './repository';
import { getConfig } from '../args/config';

let targetRemote;
let remoteFetched = false;
let gitOpts = null;

const AUTH_METHOD_HTTPS = 'https';
const AUTH_METHOD_SSH = 'ssh';
const authMethods = {
  [AUTH_METHOD_HTTPS]: 'http(s) connection',
  [AUTH_METHOD_SSH]: 'ssh with agent',
};

export async function selectRemote() {
  const repository = await getRepository();
  const remotes = await Remote.list(repository);

  // make sure "origin" is the default option
  const originIndex = remotes.indexOf('origin');
  if (originIndex > 0) {
    remotes.splice(originIndex, 1);
    remotes.unshift('origin');
  }

  let remoteName = remotes[0];

  if (!remotes.length) {
    throw new Error('No remotes seems to be configured on the given repository');
  }

  if (remotes.length > 1) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        choices: remotes,
        name: 'remoteName',
        message: 'Found multiple remotes. Which ones would you like to use?',
      },
    ]);

    ({ remoteName } = answers);
  }
  targetRemote = await Remote.lookup(repository, remoteName);
}

export async function setRemote(remoteName, remoteUrl) {
  const repository = await getRepository();
  targetRemote = await Remote.lookup(repository, remoteName);

  if (!targetRemote) {
    throw new Error(`Could not find remote with name "${remoteName}"`);
  }

  if (targetRemote.url() !== remoteUrl) {
    throw new Error(`Remote "${remoteName}" does not match url "${remoteUrl}"`);
  }
}

export async function attemptFetchRemote(authMethod) {
  const repository = await getRepository();
  console.log(`Attempting fetch using ${authMethods[authMethod]}...\n`);

  if (authMethod === AUTH_METHOD_HTTPS) {
    const { username, password } = await inquirer.prompt([
      {
        name: 'username',
        type: 'input',
        message: 'Please enter your username to authenticate with',
      },
      {
        name: 'password',
        type: 'password',
        message: 'Please enter your password',
      },
    ]);

    gitOpts = {
      fetchOpts: {
        callbacks: {
          credentials: function credentials() {
            return Cred.userpassPlaintextNew(username, password);
          },
        },
      },
    };
  } else {
    gitOpts = {
      fetchOpts: {
        callbacks: {
          credentials: function credentials(url, userName) {
            return Cred.sshKeyFromAgent(userName);
          },
        },
      },
    };
  }
  if (os.platform() === 'darwin') {
    // fix OSX bug. see nodegit docs
    gitOpts.fetchOpts.callbacks.certificateCheck = function certificateCheck() {
      return 1;
    };
  }

  try {
    await repository.fetch(targetRemote, { prune: 1, ...gitOpts.fetchOpts });
  } catch (e) {
    console.log(`\nUnable to run fetch command. Message: \n > ${e}`);
    if (authMethod === AUTH_METHOD_SSH) {
      console.log('\nPlease make sure you have ssh-agent running with valid keys');

      const isWin = /^win/.test(os.platform());
      if (isWin) {
        console.log('For windows, you can use pageant as an ssh-agent. Download it from:');
        console.log('https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html');
        console.log(
          'Run pageant and with your private key. If your key is not yet in ppk format, ',
        );
        console.log('you can convert it using puttygen (available on the same page)');
      }
    } else {
      console.log('\nMake sure you have provided the correct username and password.\n');
    }
    return false;
  }
  return true;
}

export async function fetchRemote() {
  const url = targetRemote.url();
  let authMethod = url.startsWith('http') ? AUTH_METHOD_HTTPS : AUTH_METHOD_SSH;

  let authenticated = false;

  while (!authenticated) {
    /* eslint-disable no-await-in-loop */
    authenticated = await attemptFetchRemote(authMethod);

    if (!authenticated) {
      ({ authMethod } = await inquirer.prompt([
        {
          type: 'list',
          choices: [
            {
              value: authMethod,
              name: `yes, try again with the same method (${authMethods[authMethod]})`,
            },
            ...Object.keys(authMethods)
              .filter(method => method !== authMethod) // eslint-disable-line no-loop-func
              .map(method => ({
                value: method,
                name: `yes, authenticate using ${authMethods[method]}`,
              })),
            {
              name: 'no, exit',
              value: null,
            },
          ],
          name: 'authMethod',
          message: 'Would you like to try again?',
        },
      ]));

      if (!authMethod) {
        console.log('\nBye!\n');
        process.exit();
      }
    }
    /* eslint-enable no-await-in-loop */
  }

  console.log('Successfully fetched remote');
  remoteFetched = true;
}

export async function getTargetRemote() {
  if (!targetRemote) {
    await selectRemote();
  }

  if (!remoteFetched) {
    await fetchRemote();
  }

  return targetRemote;
}

export async function getReferenceFromTargetRemote(branchName) {
  const repository = await getRepository();
  return repository.getReference(`refs/remotes/${targetRemote.name()}/${branchName}`);
}

export async function removeReference(reference) {
  const dryRun = getConfig().d;
  const remoteBranchName = targetRemote
    ? reference.name().replace(`refs/remotes/${targetRemote.name()}/`, 'refs/heads/')
    : null;

  const command = `git push ${targetRemote.name()} :${remoteBranchName}`;
  if (dryRun) {
    console.log(`[dry run] ${command}`);
  } else {
    console.log(command);
    await targetRemote.push(`:${remoteBranchName}`, gitOpts.fetchOpts);
  }
}

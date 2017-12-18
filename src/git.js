const inquirer = require('inquirer');
const os = require('os');
const { Remote, Repository, Cred, Reference, Revwalk } = require('nodegit');

let repository;
let remote;
let gitOpts = null;

const AUTH_METHOD_HTTPS = 'https';
const AUTH_METHOD_SSH = 'ssh';
const authMethods = {
  [AUTH_METHOD_HTTPS]: 'http(s) connection',
  [AUTH_METHOD_SSH]: 'ssh with agent',
};

module.exports = {};

async function attemptFetch(authMethod) {
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
          credentials: function() {
            return Cred.userpassPlaintextNew(username, password);
          },
        },
      },
    };
  } else {
    gitOpts = {
      fetchOpts: {
        callbacks: {
          ...(os.platform() === 'darwin'
            ? {
                certificateCheck: function() {
                  return 1;
                },
              }
            : {}),
          credentials: function(url, userName) {
            return Cred.sshKeyFromAgent(userName);
          },
        },
      },
    };
  }

  try {
    await repository.fetch(remote, { prune: 1, ...gitOpts.fetchOpts });
  } catch (e) {
    console.log(`\nUnable to run fetch command. Message: \n > ${e}`);
    if (authMethod === AUTH_METHOD_SSH) {
      console.log('\nPlease make sure you have ssh-agent running with valid keys');

      const isWin = /^win/.test(os.platform());
      if (isWin) {
        console.log('For windows, you can use pageant as an ssh-agent. Download it from:');
        console.log('https://www.chiark.greenend.org.uk/~sgtatham/putty/latest.html');
        console.log(
          'Run pageant and with your private key. If your key is not yet in ppk format, you can convert it using puttygen (available on the same page)\n',
        );
      }
    } else {
      console.log('\nMake sure you have provided the correct username and password.\n');
    }
    return false;
  }
  return true;
}

module.exports.fetchAll = async function() {
  if (!repository || !remote) {
    throw new ReferenceError('Please open repository first');
  }

  const url = remote.url();
  let authMethod = url.startsWith('http') ? AUTH_METHOD_HTTPS : AUTH_METHOD_SSH;

  let authenticated = false;

  while (!authenticated) {
    authenticated = await attemptFetch(authMethod);

    if (!authenticated) {
      ({ authMethod } = await inquirer.prompt([
        {
          type: 'list',
          choices: [
            ...Object.keys(authMethods).map(method => ({
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
  }

  console.log('Fetch successful');
};

module.exports.openRepository = async function(repositoryPath) {
  try {
    repository = await Repository.open(repositoryPath);
  } catch (e) {
    console.error(`Could not open repository at "${repositoryPath}"`);
    throw e;
  }
  const remotes = await Remote.list(repository);

  // make sure "origin" is the default option
  const originIndex = remotes.indexOf('origin');
  if (originIndex > 0) {
    remotes.splice(originIndex, 1);
    remotes.unshift('origin');
  }

  let remoteName = remotes[0];

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
  remote = await Remote.lookup(repository, remoteName);
};

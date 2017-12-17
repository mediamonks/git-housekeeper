const inquirer = require('inquirer');
const { Remote, Repository, Cred, Reference, Revwalk } = require('nodegit');

let repository;
let remote;

module.exports = {};

module.exports.openRepository = async function(repositoryPath) {
  try {
    repository = await Repository.open(repositoryPath);
  } catch (e) {
    console.error(`Could not open repository at "${repositoryPath}"`);
    throw e;
  }
  const remotes = await Remote.list(repository);

  if (remotes.length > 1) {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        choices: remotes,
        name: 'remote',
        message: 'Found multiple remotes. Which ones would you like to use?',
      },
    ]);

    ({ remote } = answers);
  }
};

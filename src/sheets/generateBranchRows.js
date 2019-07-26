import moment from 'moment';
import { uniq, flatten, groupBy } from 'lodash';
import { generateHiddenColumn, generateNumberValue, generateStringValue } from './sheetUtils';
import { COLOR_BORDER_DARK, COLOR_BORDER_LIGHT, NUM_COMMITS_IN_SHEET } from '../const';

function generateBranchRows(branches) {
  const branchesByAuthor = groupBy(branches, branch =>
    branch.commits.ahead.length ? branch.commits.ahead[0].author : 'none',
  );

  return flatten(
    Object.keys(branchesByAuthor)
      .sort()
      .map(author => {
        const authorBranches = branchesByAuthor[author];

        return [
          ...authorBranches.map((branch, index) => {
            const lastCommitTime = branch.commits.ahead.length
              ? moment(branch.commits.ahead[0].time)
              : null;
            const date = lastCommitTime ? lastCommitTime.format('YYYY,M,D') : '';
            const time = lastCommitTime ? lastCommitTime.format('H,m,s') : '';

            return {
              values: [
                // branch ref name
                generateHiddenColumn(`${branch.name}:${branch.headSha}`),
                // last commit author
                {
                  ...generateStringValue(index ? '' : author),
                  userEnteredFormat: {
                    wrapStrategy: 'CLIP',
                    textFormat: {
                      bold: true,
                    },
                  },
                },
                // branch
                {
                  ...generateStringValue(branch.shortName),
                  userEnteredFormat: {
                    wrapStrategy: 'CLIP',
                  },
                },
                // authors
                {
                  ...generateStringValue(uniq(branch.commits.ahead.map(c => c.author)).join(', ')),
                  userEnteredFormat: {
                    wrapStrategy: 'CLIP',
                  },
                },
                // last commit date
                date
                  ? {
                      userEnteredValue: {
                        formulaValue: `=DATE(${date})`,
                      },
                      userEnteredFormat: {
                        wrapStrategy: 'CLIP',
                        numberFormat: {
                          type: 'DATE',
                        },
                        textFormat: {
                          fontFamily: 'Roboto Mono',
                          fontSize: 9,
                        },
                      },
                    }
                  : generateStringValue(''),
                // last commit time
                time
                  ? {
                      userEnteredValue: {
                        formulaValue: `=TIME(${time})`,
                      },
                      userEnteredFormat: {
                        wrapStrategy: 'CLIP',
                        numberFormat: {
                          type: 'TIME',
                          pattern: 'hh:mm',
                        },
                        textFormat: {
                          fontFamily: 'Roboto Mono',
                          fontSize: 9,
                        },
                      },
                    }
                  : generateStringValue(''),
                // action
                {
                  dataValidation: {
                    condition: {
                      type: 'ONE_OF_LIST',
                      values: [
                        { userEnteredValue: '' },
                        { userEnteredValue: 'KEEP' },
                        { userEnteredValue: 'DELETE' },
                      ],
                    },
                    strict: true,
                    showCustomUi: true,
                  },
                },
                // behind
                {
                  ...generateNumberValue(branch.commits.numBehind),
                  userEnteredFormat: {
                    borders: {
                      left: {
                        style: 'SOLID',
                        color: COLOR_BORDER_DARK,
                      },
                    },
                  },
                },
                // ahead
                {
                  ...generateNumberValue(branch.commits.numAhead),
                  userEnteredFormat: {
                    horizontalAlignment: 'LEFT',
                    borders: {
                      right: {
                        style: 'SOLID',
                        color: COLOR_BORDER_LIGHT,
                      },
                    },
                  },
                },
                // commits
                ...branch.commits.ahead.slice(0, NUM_COMMITS_IN_SHEET).map(commit => ({
                  userEnteredValue: {
                    stringValue: `${commit.sha} ${commit.summary || ''}`,
                  },
                  userEnteredFormat: {
                    wrapStrategy: 'CLIP',
                    padding: {
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 12,
                    },
                    textFormat: {
                      fontFamily: 'Roboto Mono',
                      fontSize: 9,
                    },
                  },
                })),
                ...(branch.commits.numAhead > NUM_COMMITS_IN_SHEET
                  ? [
                      generateStringValue(
                        `(${branch.commits.numAhead - NUM_COMMITS_IN_SHEET} more)`,
                      ),
                    ]
                  : []),
              ],
            };
          }),
          // spacer row
          { values: [] },
        ];
      }),
  );
}

export default generateBranchRows;

import opn from 'opn';
import ProgressBar from 'progress';
import moment from 'moment';
import { flatten, groupBy, uniq } from 'lodash';
import packageJson from '../../package.json';
import {
  COLOR_BORDER_DARK,
  COLOR_BORDER_LIGHT,
  COLOR_DELETE,
  COLOR_KEEP,
  DEFAULT_BASE_BRANCHES,
  NUM_COMMITS_IN_SHEET,
  SHEET_COL_SIZE,
} from '../const';
import { getBranchAheadBehind } from '../git';
import { authenticate, createSheet } from './sheetsApi';
import { generateHeadRow, generateTitleRows } from './sheetTitleHead';
import { generateHiddenColumn, generateNumberValue, generateStringValue } from './sheetUtils';

function processColSpan(rowDataWithSpan, sheetId = 0) {
  const rowData = [];
  const merges = [];

  for (let rowIndex = 0; rowIndex < rowDataWithSpan.length; rowIndex++) {
    rowData[rowIndex] = {
      ...rowDataWithSpan[rowIndex],
      values: [],
    };
    const row = rowDataWithSpan[rowIndex].values;
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const col = row[colIndex];
      if (col.span && col.col) {
        const trueColIndex = rowData[rowIndex].values.length;
        const colSpan = col.span.cols || 1;
        merges.push({
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + (col.span.rows || 1),
          startColumnIndex: trueColIndex,
          endColumnIndex: trueColIndex + colSpan,
        });

        rowData[rowIndex].values.push(col.col);
        for (let i = 0; i < colSpan - 1; i++) {
          rowData[rowIndex].values.push({});
        }
      } else {
        rowData[rowIndex].values.push(col);
      }
    }
  }

  return { rowData, merges };
}

function generateBranchRows(branches, branchCommits) {
  const branchesWithCommits = branches.map((branch, index) => ({
    ...branch,
    commits: branchCommits[index],
  }));

  const branchesByAuthor = groupBy(
    branchesWithCommits,
    branch => (branch.commits.ahead.length ? branch.commits.ahead[0].author().name() : 'none'),
  );

  return flatten(
    Object.keys(branchesByAuthor)
      .sort()
      .map(author => {
        const authorBranches = branchesByAuthor[author];

        return [
          ...authorBranches.map((branch, index) => {
            const lastCommitTime = branch.commits.ahead.length
              ? moment(branch.commits.ahead[0].timeMs())
              : null;
            const date = lastCommitTime ? lastCommitTime.format('YYYY,M,D') : '';
            const time = lastCommitTime ? lastCommitTime.format('H,m,s') : '';

            return {
              values: [
                // branch ref name
                generateHiddenColumn(branch.name),
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
                  ...generateStringValue(
                    uniq(branch.commits.ahead.map(c => c.author().name())).join(', '),
                  ),
                  userEnteredFormat: {
                    wrapStrategy: 'CLIP',
                  },
                },
                // last commit date
                {
                  userEnteredValue: {
                    formulaValue: date ? `=DATE(${date})` : '',
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
                },
                // last commit time
                {
                  userEnteredValue: {
                    formulaValue: time ? `=TIME(${time})` : '',
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
                },
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
                  ...generateNumberValue(branch.commits.behind.length),
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
                  ...generateNumberValue(branch.commits.ahead.length),
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
                    stringValue: `${commit.sha().substring(0, 6)} ${commit.summary()}`,
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
              ],
            };
          }),
          // spacer row
          { values: [] },
        ];
      }),
  );
}

const generateConditionalFormatting = () => [
  {
    ranges: [
      {
        sheetId: 0,
        startRowIndex: 5,
        startColumnIndex: 1,
        endColumnIndex: 7,
      },
    ],
    booleanRule: {
      condition: {
        type: 'CUSTOM_FORMULA',
        values: [
          {
            userEnteredValue: '=EQ(INDIRECT("RC7",false), "KEEP")',
          },
        ],
      },
      format: {
        backgroundColor: COLOR_KEEP,
      },
    },
  },
  {
    ranges: [
      {
        sheetId: 0,
        startRowIndex: 2,
        startColumnIndex: 1,
        endColumnIndex: 7,
      },
    ],
    booleanRule: {
      condition: {
        type: 'CUSTOM_FORMULA',
        values: [
          {
            userEnteredValue: '=EQ(INDIRECT("RC7",false), "DELETE")',
          },
        ],
      },
      format: {
        backgroundColor: COLOR_DELETE,
      },
    },
  },
];

function generateSheetData(branches, branchCommits, baseBranch) {
  const { merges, rowData } = processColSpan([
    ...generateTitleRows(baseBranch),
    generateHeadRow(baseBranch),
    ...generateBranchRows(branches, branchCommits),
  ]);
  const { HIDDEN, S, M, L } = SHEET_COL_SIZE;

  return {
    properties: {
      sheetId: 0,
      title: 'branches',
      gridProperties: {
        frozenRowCount: 4,
      },
    },
    data: {
      startRow: 0,
      startColumn: 0,
      rowData,
      columnMetadata: [
        // hidden
        { pixelSize: HIDDEN },
        // last commit author
        { pixelSize: M },
        // branch
        { pixelSize: L },
        // authors
        { pixelSize: L },
        // last commit date
        { pixelSize: S + 20 },
        // last commit time
        { pixelSize: S - 20 },
        // action
        { pixelSize: M },
        // behind
        { pixelSize: S },
        // ahead
        { pixelSize: S },
        // commits
        ...new Array(NUM_COMMITS_IN_SHEET).fill({ pixelSize: S }),
      ],
    },
    merges,
    conditionalFormats: generateConditionalFormatting(),
  };
}

async function reviewGoogleSheets(argv, remoteBranches, baseBranch, commitsInBase) {
  const authenticated = await authenticate();
  if (!authenticated) {
    return true;
  }

  const branches = remoteBranches.filter(
    branch =>
      !(
        DEFAULT_BASE_BRANCHES.some(branchName => branch.name.endsWith(branchName)) ||
        branch.name.endsWith(baseBranch)
      ),
  );

  console.log('reading commits on remote branches...');

  const shaInBase = commitsInBase.map(commit => commit.sha());
  const progressBar = new ProgressBar(':bar', { total: branches.length });

  const branchCommits = await Promise.all(
    branches.map(async branch => {
      const commits = await getBranchAheadBehind(branch.ref, shaInBase);

      progressBar.tick();
      return commits;
    }),
  );

  progressBar.terminate();
  const sheetData = generateSheetData(branches, branchCommits, baseBranch);
  const response = await createSheet(
    sheetData,
    `${packageJson.name} ${moment().format('MM/DD/YYYY HH:MM')}`,
  );
  if (!response) {
    return true;
  }
  console.log('Created google sheet at:');
  console.log(response.spreadsheetUrl);
  opn(response.spreadsheetUrl);
}

export default reviewGoogleSheets;

import { getTargetRemote } from '../git';
import packageJson from '../../package.json';
import { generateHiddenColumn, generateStringValue, generateTitleColumn } from './sheetUtils';
import { COLOR_BORDER_DARK, COLOR_BORDER_LIGHT } from '../const';

export const generateTitleRows = baseBranch => [
  {
    values: [
      generateHiddenColumn(packageJson.version),
      {
        span: { cols: 2, rows: 3 },
        col: generateTitleColumn('Git Housekeeper'),
      },
      {
        span: { cols: 3 },
        col: {
          ...generateStringValue(`sheet generated by ${packageJson.name}`),
        },
      },
      {
        userEnteredValue: {
          formulaValue: `=HYPERLINK("${packageJson.homepage}", "click here for more info")`,
        },
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          borders: {
            right: {
              style: 'SOLID',
              color: COLOR_BORDER_DARK,
            },
          },
        },
      },
      {
        span: { cols: 2, rows: 3 },
        col: {
          ...generateStringValue(`base branch: ${baseBranch}`),
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'BOTTOM',
            wrapStrategy: 'WRAP',
            borders: {
              right: {
                style: 'SOLID',
                color: COLOR_BORDER_LIGHT,
              },
            },
          },
        },
      },
    ],
  },
  {
    values: [
      generateHiddenColumn(getTargetRemote().name()),
      {},
      {},
      {
        span: { cols: 4 },
        col: {
          ...generateStringValue(
            'instructions: for each branch, select the desired action in the "action" column',
          ),
          userEnteredFormat: {
            borders: {
              right: {
                style: 'SOLID',
                color: COLOR_BORDER_DARK,
              },
            },
          },
        },
      },
    ],
  },
  {
    values: [
      generateHiddenColumn(getTargetRemote().url()),
      {},
      {},
      {
        span: { cols: 4 },
        col: {
          ...generateStringValue(
            'do not edit the first column (pink background). feel free to make other changes',
          ),
          userEnteredFormat: {
            borders: {
              bottom: {
                style: 'SOLID',
                color: COLOR_BORDER_DARK,
              },
              right: {
                style: 'SOLID',
                color: COLOR_BORDER_DARK,
              },
            },
          },
        },
      },
    ],
  },
];

export const generateHeadColumn = (content, customFormat) => ({
  ...generateStringValue(content),
  userEnteredFormat: {
    horizontalAlignment: 'CENTER',
    wrapStrategy: 'WRAP',
    textFormat: {
      bold: true,
    },
    ...customFormat,
  },
});

export const generateHeadRow = baseBranch => ({
  values: [
    generateHiddenColumn(baseBranch),
    generateHeadColumn('last commit author'),
    generateHeadColumn('branch'),
    generateHeadColumn('authors'),
    {
      span: { cols: 2 },
      col: generateHeadColumn('last commit time'),
    },
    generateHeadColumn('action'),
    generateHeadColumn('behind', {
      borders: {
        left: {
          style: 'SOLID',
          color: COLOR_BORDER_DARK,
        },
      },
    }),
    generateHeadColumn('ahead', {
      borders: {
        right: {
          style: 'SOLID',
          color: COLOR_BORDER_LIGHT,
        },
      },
    }),
    {
      span: { cols: 2 },
      col: generateHeadColumn('commits'),
    },
    {
      span: { cols: 4 },
      col: { ...generateStringValue('select cell for commit summary') },
    },
  ],
});
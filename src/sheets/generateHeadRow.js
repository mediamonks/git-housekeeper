import { generateHiddenColumn, generateStringValue } from './sheetUtils';
import { COLOR_BORDER_DARK, COLOR_BORDER_LIGHT } from '../const';

const generateHeadColumn = (content, customFormat) => ({
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

const generateHeadRow = baseBranch => ({
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

export default generateHeadRow;

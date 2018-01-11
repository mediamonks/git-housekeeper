import { COLOR_BORDER_DARK, COLOR_HIDDEN_COLUMN } from '../const';

export function processColSpan(rowDataWithSpan, sheetId = 0) {
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

export const generateStringValue = stringValue => ({
  userEnteredValue: { stringValue },
});

export const generateNumberValue = numberValue => ({
  userEnteredValue: { numberValue },
});

export const generatePadding = ({ top = 0, right = 0, bottom = 0, left = 0 } = {}) => ({
  padding: { top, right, bottom, left },
});

export const generateHiddenColumn = value => ({
  ...generateStringValue(value),
  userEnteredFormat: {
    wrapStrategy: 'CLIP',
    backgroundColor: COLOR_HIDDEN_COLUMN,
    ...generatePadding({ left: 10 }),
    borders: {
      right: {
        style: 'SOLID',
        color: COLOR_BORDER_DARK,
      },
    },
  },
});

export const generateTitleColumn = title => ({
  ...generateStringValue(title),
  userEnteredFormat: {
    wrapStrategy: 'WRAP',
    verticalAlignment: 'MIDDLE',
    horizontalAlignment: 'CENTER',
    textFormat: {
      fontSize: 20,
      bold: true,
    },
    borders: {
      bottom: {
        style: 'SOLID',
        color: COLOR_BORDER_DARK,
      },
    },
  },
});

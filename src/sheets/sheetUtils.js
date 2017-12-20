import { COLOR_BORDER_DARK, COLOR_HIDDEN_COLUMN } from '../const';

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

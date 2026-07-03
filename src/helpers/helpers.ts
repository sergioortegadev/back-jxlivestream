/* eslint-disable no-console */


export const messageLog = (message: string, timeZone = 'America/Argentina/Cordoba'):string => {
  const time = Temporal.Now.zonedDateTimeISO(timeZone).toPlainTime().toString({ smallestUnit: 'second' });
  return `  ${time} - ${message}`
}

export const simpleLog = (timeZone = 'America/Argentina/Cordoba'):string => {
  const time = Temporal.Now.zonedDateTimeISO(timeZone).toPlainTime().toString({ smallestUnit: 'second' });
  return `  ${time} - `
}

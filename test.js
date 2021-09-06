const { google } = require('googleapis');
const {
  assuredworkloads,
} = require('googleapis/build/src/apis/assuredworkloads');
const keys = require('./keys.json');

const client = new google.auth.JWT(keys.client_email, null, keys.private_key, [
  'https://www.googleapis.com/auth/spreadsheets',
]);

client.authorize((err, tokens) => {
  if (err) {
    console.log(err);
    return;
  } else {
    console.log('Connected');
    gsrun(client);
  }
});

async function gsrun(cl) {
  const gsapi = google.sheets({ version: 'v4', auth: cl });
  // opt get
  // const opt = {
  //   spreadsheetId: '13FR97-ju9w2ZhmDQERtuog676C4D00DqdBXwPJ5yylM',
  //   range: 'Data!A2:B1000',
  // };
  // opt update
  const dataValue = [['089694331588', 'hallo guys']];
  const updateOptions = {
    spreadsheetId: '13FR97-ju9w2ZhmDQERtuog676C4D00DqdBXwPJ5yylM',
    range: 'Data!A2',
    valueInputOption: 'RAW',
    resource: { values: dataValue },
  };

  let res = await gsapi.spreadsheets.values.update(updateOptions);

  console.log(res);
}

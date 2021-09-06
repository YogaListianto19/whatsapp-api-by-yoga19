const { Client, Pool, Query } = require('pg');

const connectionString = 'postgressql://odoo14:admin@localhost:5432/db_coba';

const client = new Client({
  connectionString: connectionString,
});

client.connect();

const ambilName = async (keyword) => {
  // try {
  //   const b = await client
  //     .query('Select * from spk_student WHERE keyword = $1::text', [id_number])
  //     .then((res) => console.log(res.rows[0].name))
  //     .catch((e) => console.log('tidak ada'))
  //     .then(() => client.end());
  //   return res.rows[0].name;
  // } catch (err) {
  //   throw err;
  // }
  // const query = new Query('Select * from spk_student WHERE id_number = $1::text', [id_number]);
  // const result = client.query(query);
  // const result = []
  try {
    const res = await client.query(
      'Select * from wa_keywords WHERE keyword = $1',
      [keyword]
    );
    if (res.rows.length) return res.rows[0].reply;
    console.log('gagal');
    return '';
  } catch (e) {
    throw e;
  }
};

// console.log(ambilName('S-0001'));

const readSession = async () => {
  try {
    const res = await client.query(
      'SELECT * from wa_sessions ORDER BY created_at DESC LIMIT 1'
    );
    if (res.rows.length) return res.rows[0].session;
    return '';
  } catch (err) {
    throw err;
  }
};

const saveSession = (session) => {
  client.query(
    'INSERT INTO wa_sessions (session) VALUES($1)',
    [session],
    (err, results) => {
      if (err) {
        console.error('Failed to save session!', err);
      } else {
        console.log('Session saved!');
      }
    }
  );
};

const removeSession = () => {
  client.query('DELETE FROM wa_sessions', (err, results) => {
    if (err) {
      console.error('Failed to remove session!', err);
    } else {
      console.log('Session deleted!');
    }
  });
};

module.exports = {
  readSession,
  saveSession,
  removeSession,
  ambilName,
};

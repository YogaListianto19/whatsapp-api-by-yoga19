const phoneNumberFormatter = (number) => {
  // 1. Menghilangkan karakter selain angka
  let formatted = number.replace(/\D/g, '');

  // 2. Menghilangkan angka 0 didepan (prefix) mengganti dengan 62
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substr(1);
  }

  // 3. otomatis tambahkan akhiran "@c.us"
  if (!formatted.endsWith('@c.us')) {
    formatted += '@c.us';
  }

  return formatted;
};

module.exports = { phoneNumberFormatter };

const allowedEmails = () => {
  const raw = process.env.ALLOWED_GOOGLE_EMAILS || '';
  return raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
};

function isAllowedEmail(email) {
  const list = allowedEmails();
  if (list.length === 0) return true;
  return list.includes((email || '').toLowerCase());
}

module.exports = { isAllowedEmail, allowedEmails };

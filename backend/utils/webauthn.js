const db = require('../db');

// 🔹 Save WebAuthn credential
exports.saveUserCredential = async (userId, credentialID, publicKey, counter) => {
  await db.execute(
    `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter)
     VALUES (?, ?, ?, ?)`,
    [userId, credentialID, publicKey.toString('base64'), counter]
  );
};

// 🔹 Get user credential from DB
exports.getUserCredential = async (userId) => {
  const [rows] = await db.execute(
    `SELECT * FROM webauthn_credentials WHERE user_id = ? LIMIT 1`,
    [userId]
  );
  return rows[0];
};

// 🔹 Update counter after successful auth
exports.updateCounter = async (userId, newCounter) => {
  await db.execute(
    `UPDATE webauthn_credentials SET counter = ? WHERE user_id = ?`,
    [newCounter, userId]
  );
};

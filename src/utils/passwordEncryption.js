const crypto = require("crypto");

const HASH_ALGORITHM_VERSION = "expense-tracker-password-v1";
const PBKDF2_ITERATIONS = 120000;
const HASH_LENGTH_BYTES = 32;

const normalizePem = (pem) => String(pem || "").replace(/\\n/g, "\n").trim();

const toBase64Url = (buffer) =>
  Buffer.from(buffer).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const getPrivateKey = () => {
  const privateKey = normalizePem(process.env.AUTH_PRIVATE_KEY);

  if (!privateKey) {
    throw new Error("Password decryption is not configured.");
  }

  return privateKey;
};

const decryptPasswordForAuth = (encryptedPassword) => {
  const decryptedPassword = crypto.privateDecrypt(
    {
      key: getPrivateKey(),
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: "sha256",
    },
    Buffer.from(encryptedPassword, "base64"),
  );

  return decryptedPassword.toString("utf8");
};

const hashLegacyPasswordForAuth = ({ email, password }) => {
  const salt = `${HASH_ALGORITHM_VERSION}:${String(email || "").trim().toLowerCase()}`;
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    HASH_LENGTH_BYTES,
    "sha256",
  );

  return `${HASH_ALGORITHM_VERSION}.${toBase64Url(hash)}`;
};

module.exports = {
  decryptPasswordForAuth,
  hashLegacyPasswordForAuth,
};

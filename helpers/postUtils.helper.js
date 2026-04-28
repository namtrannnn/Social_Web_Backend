const mongoose = require("mongoose");

function parseAllowedUsers(raw) {
  if (raw === undefined) return undefined;

  let allowedUsers = raw;

  if (typeof allowedUsers === "string") {
    try {
      allowedUsers = JSON.parse(allowedUsers);
    } catch {
      allowedUsers = [];
    }
  }

  if (!Array.isArray(allowedUsers)) return [];

  return [...new Set(allowedUsers.map((id) => id.toString()))]
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function normalizeVisibility(rawVisibility) {
  const valid = ["public", "followers", "friends", "private", "custom"];
  const visibility =
    typeof rawVisibility === "string" ? rawVisibility : "public";
  return valid.includes(visibility) ? visibility : "public";
}

function extractHashtags(text) {
  if (!text) return [];
  const matches = text.match(/#([\p{L}\p{N}_]+)/gu) || [];
  return [...new Set(matches.map((item) => item.slice(1).toLowerCase()))];
}
module.exports = {
  parseAllowedUsers,
  normalizeVisibility,
  extractHashtags,
};

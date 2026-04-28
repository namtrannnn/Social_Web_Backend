const mongoose = require("mongoose");
const Post = require("../api/v1/models/post.model");
// =========================
// Helper: tính điểm độ mới
// =========================
function calculateFreshnessScore(createdAt) {
  const now = Date.now();
  const postTime = new Date(createdAt).getTime();
  const diffHours = (now - postTime) / (1000 * 60 * 60);

  if (diffHours <= 6) return 30;
  if (diffHours <= 24) return 20;
  if (diffHours <= 72) return 10;
  if (diffHours <= 168) return 5; // 7 ngày

  return 0;
}

// =========================
// Helper: điểm ưu tiên theo nguồn
// =========================
function calculateSourceBonus(sourceType) {
  switch (sourceType) {
    case "following":
      return 40;
    case "interest":
      return 20;
    case "hot":
      return 15;
    default:
      return 0;
  }
}

// =========================
// Helper: điểm gần gũi giữa user và author
// =========================
function calculateAffinityScore(post, currentUserId, followingIds = []) {
  const authorId = post.author?._id
    ? post.author._id.toString()
    : post.author.toString();

  const currentUserIdStr = currentUserId.toString();
  const followingIdStrings = followingIds.map((id) => id.toString());

  if (authorId === currentUserIdStr) return 5;
  if (followingIdStrings.includes(authorId)) return 3;

  return 0;
}

// =========================
// Helper: điểm khớp sở thích
// =========================
function calculateInterestMatchScore(post, userInterestHashtags = []) {
  if (!Array.isArray(post.hashtags) || post.hashtags.length === 0) return 0;
  if (!Array.isArray(userInterestHashtags) || userInterestHashtags.length === 0)
    return 0;

  const userInterestSet = new Set(userInterestHashtags);
  let matchedCount = 0;

  for (const tag of post.hashtags) {
    if (userInterestSet.has(tag)) {
      matchedCount += 1;
    }
  }

  return matchedCount;
}

// =========================
// Helper: tính tổng điểm bài viết
// =========================
function calculatePostScore(
  post,
  currentUserId,
  followingIds = [],
  userInterestHashtags = [],
) {
  const likesCount = post.likesCount || 0;
  const commentsCount = post.commentsCount || 0;
  const savesCount = post.savesCount || 0;

  const sourceBonus = calculateSourceBonus(post.sourceType);
  const affinityScore = calculateAffinityScore(
    post,
    currentUserId,
    followingIds,
  );
  const interestMatchScore = calculateInterestMatchScore(
    post,
    userInterestHashtags,
  );
  const freshnessScore = calculateFreshnessScore(post.createdAt);

  const score =
    sourceBonus +
    4 * likesCount +
    6 * commentsCount +
    8 * savesCount +
    10 * affinityScore +
    7 * interestMatchScore +
    freshnessScore;

  return {
    ...post,
    score,
    scoreDetail: {
      sourceBonus,
      likesCount,
      commentsCount,
      savesCount,
      affinityScore,
      interestMatchScore,
      freshnessScore,
    },
  };
}

// =========================
// Helper: bỏ trùng bài viết theo _id
// Nếu trùng, giữ bài có score nguồn ưu tiên hơn
// =========================
function uniquePostsById(posts) {
  const map = new Map();

  for (const post of posts) {
    const key = post._id.toString();

    if (!map.has(key)) {
      map.set(key, post);
      continue;
    }

    const existingPost = map.get(key);
    const oldBonus = calculateSourceBonus(existingPost.sourceType);
    const newBonus = calculateSourceBonus(post.sourceType);

    if (newBonus > oldBonus) {
      map.set(key, post);
    }
  }

  return [...map.values()];
}

// =========================
// Helper: lấy hashtag quan tâm của user
// Tạm lấy từ bài viết gần đây của chính user
// Sau này có thể nâng cấp từ like/save/view
// =========================
async function getUserInterestHashtags(userId) {
  const myRecentPosts = await Post.find({
    author: userId,
    status: "active",
  })
    .select("hashtags")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const hashtagMap = new Map();

  for (const post of myRecentPosts) {
    for (const tag of post.hashtags || []) {
      hashtagMap.set(tag, (hashtagMap.get(tag) || 0) + 1);
    }
  }

  return [...hashtagMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((item) => item[0]);
}

// =========================
// Helper: gắn sourceType cho bài viết
// =========================
function attachSourceType(posts, sourceType) {
  return posts.map((post) => ({
    ...post.toObject(),
    sourceType,
  }));
}

module.exports = {
  calculatePostScore,
  calculateFreshnessScore,
  calculateAffinityScore,
  calculateInterestMatchScore,
  calculateSourceBonus,
  uniquePostsById,
  attachSourceType,
  getUserInterestHashtags,
};

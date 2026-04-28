function normalizeObjectIdArray(arr = []) {
  return arr.map((item) => item.toString());
}

function isOwner(viewerId, authorId) {
  if (!viewerId || !authorId) return false;
  return viewerId.toString() === authorId.toString();
}

function isFollower(viewerId, author) {
  if (!viewerId || !author) return false;
  const followers = normalizeObjectIdArray(author.followers || []);
  return followers.includes(viewerId.toString());
}

function isFriend(viewerId, author) {
  if (!viewerId || !author) return false;

  const friendIds = (author.friendList || []).map((item) =>
    item.user_id?.toString(),
  );

  return friendIds.includes(viewerId.toString());
}

function isAllowedCustomUser(viewerId, story) {
  if (!viewerId || !story) return false;

  const allowedUsers = normalizeObjectIdArray(story.allowedUsers || []);
  return allowedUsers.includes(viewerId.toString());
}

function canViewStory(story, viewerId, author) {
  if (!story || !author) return false;

  if (isOwner(viewerId, author._id)) return true;

  switch (story.visibility) {
    case "public":
      return true;

    case "followers":
      return isFollower(viewerId, author);

    case "friends":
      return isFriend(viewerId, author);

    case "private":
      return false;

    case "custom":
      return isAllowedCustomUser(viewerId, story);

    default:
      return false;
  }
}

module.exports = {
  canViewStory,
};

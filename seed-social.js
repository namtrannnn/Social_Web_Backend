const mongoose = require("mongoose");
const md5 = require("md5");
require("dotenv").config();
const User = require("./api/v1/models/user.model");
const Post = require("./api/v1/models/post.model");

const MONGO_URL = process.env.MONGO_URL;

const sampleHashtags = [
  ["travel", "beach", "summer"],
  ["food", "coffee", "cafe"],
  ["coding", "javascript", "nodejs"],
  ["gym", "fitness", "health"],
  ["fashion", "style", "ootd"],
  ["music", "chill", "night"],
  ["pet", "cat", "dog"],
  ["nature", "mountain", "camping"],
];

const sampleCaptions = [
  "Hôm nay đi chơi vui quá #travel #summer",
  "Một buổi cà phê nhẹ nhàng #coffee #cafe",
  "Code đêm tiếp thôi #coding #nodejs",
  "Tập luyện mỗi ngày #gym #fitness",
  "Set đồ hôm nay khá ổn #fashion #ootd",
  "Nghe nhạc thư giãn #music #chill",
  "Boss hôm nay ngoan ghê #pet #cat",
  "Cuối tuần đi cắm trại #nature #camping",
];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function extractHashtagsFromCaption(caption) {
  const matches = caption.match(/#([\p{L}\p{N}_]+)/gu) || [];
  return [...new Set(matches.map((item) => item.slice(1).toLowerCase()))];
}

async function seed() {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("Connected MongoDB");

    // await User.deleteMany({});
    // await Post.deleteMany({});
    // console.log("Deleted old data");

    const hashedPassword = md5("123456");

    const usersData = [];

    for (let i = 1; i <= 12; i++) {
      usersData.push({
        fullName: `User ${i}`,
        email: `user${i}@gmail.com`,
        password: hashedPassword,
        username: `user${i}`,
        avatar: `https://picsum.photos/200/200?random=${i}`,
        bio: `Xin chao, toi la user ${i}`,
        followers: [],
        following: [],
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
      });
    }

    const users = await User.insertMany(usersData);
    console.log(`Inserted ${users.length} users`);

    // Fake follow relations
    for (let i = 0; i < users.length; i++) {
      const me = users[i];
      const possibleTargets = users.filter(
        (u) => u._id.toString() !== me._id.toString(),
      );

      const followCount = randomInt(2, 5);
      const shuffled = possibleTargets
        .sort(() => 0.5 - Math.random())
        .slice(0, followCount);

      for (const target of shuffled) {
        await User.updateOne(
          { _id: me._id },
          { $addToSet: { following: target._id } },
        );

        await User.updateOne(
          { _id: target._id },
          { $addToSet: { followers: me._id } },
        );
      }
    }

    // Sync follow counts
    const updatedUsers = await User.find({});
    for (const user of updatedUsers) {
      await User.updateOne(
        { _id: user._id },
        {
          followingCount: (user.following || []).length,
          followersCount: (user.followers || []).length,
        },
      );
    }

    // Fake posts
    const postsData = [];

    for (const user of updatedUsers) {
      const postCount = randomInt(3, 8);

      for (let i = 0; i < postCount; i++) {
        const caption = randomItem(sampleCaptions);
        const hashtags = extractHashtagsFromCaption(caption);

        const createdAt = new Date(
          Date.now() - randomInt(1, 10) * 24 * 60 * 60 * 1000,
        );

        postsData.push({
          author: user._id,
          caption,
          media: [
            {
              url: `https://picsum.photos/600/600?random=${randomInt(1, 1000)}`,
              public_id: "",
              type: "image",
              thumbnail: "",
              width: 600,
              height: 600,
            },
          ],
          location: randomItem([
            "Ho Chi Minh City",
            "Ha Noi",
            "Da Nang",
            "Can Tho",
            "Binh Duong",
            "",
          ]),
          hashtags,
          mentions: [],
          taggedUsers: [],
          likesCount: randomInt(0, 200),
          commentsCount: randomInt(0, 50),
          savesCount: randomInt(0, 30),
          allowComments: true,
          hideLikeCount: false,
          status: "active",
          isEdited: false,
          editedAt: null,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    const posts = await Post.insertMany(postsData);
    console.log(`Inserted ${posts.length} posts`);

    // Sync postsCount
    const finalUsers = await User.find({});
    for (const user of finalUsers) {
      const count = await Post.countDocuments({
        author: user._id,
        status: "active",
      });
      await User.updateOne({ _id: user._id }, { postsCount: count });
    }

    console.log("Seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  }
}

seed();

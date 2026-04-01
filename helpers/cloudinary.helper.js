const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: "dn2u3dcrh",
  api_key: "786261853477187",
  api_secret: "qZezPF3KXgM9irqNvsA3kRY_Sks",
});

const folder = "social-fb";

const uploadStreamToCloudinary = (buffer, path) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder + path,
      },
      (error, result) => {
        if (result)
          resolve({
            url: result.secure_url,
            public_id: result.public_id,
          });
        else reject(error);
      }
    );

    streamifier.createReadStream(buffer).pipe(stream);
  });
};

module.exports = uploadStreamToCloudinary;

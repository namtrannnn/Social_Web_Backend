module.exports.searchHelper = (query) => {
  const regex = new RegExp(query.keyword, "i");
  //   console.log("regex", regex);
  return regex;
};

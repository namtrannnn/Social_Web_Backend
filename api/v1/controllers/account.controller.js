const User = require("../models/user.model");
const searchHelper = require("../../../helpers/search.helper");
const paginationHelper = require("../../../helpers/pagination.helper");

// [GET] api/v1/account
module.exports.index = async (req, res) => {
  try {
    let find = {
      deleted: false,
    };
    if (req.query.status) {
      find.status = req.query.status;
    }

    // sort
    let sort = {};
    if (req.query.sortKey && req.query.sortValue) {
      sort[req.query.sortKey] = req.query.sortValue;
    } else {
      sort.position = "desc";
    }

    // search
    if (req.query.keyword) {
      const objectSearch = searchHelper.searchHelper(req.query);
      // console.log("objectSearch", objectSearch);
      find.fullName = objectSearch;
    }

    // pagination
    const countUser = await User.countDocuments();
    const objectPagination = paginationHelper(
      {
        currentPage: 1,
        limitUser: 4,
      },
      req.query,
      countUser
    );
    // console.log("objectPagination", objectPagination);

    const users = await User.find(find)
      .sort(sort)
      .skip(objectPagination.skip)
      .limit(objectPagination.limit);
    res.json({
      code: 200,
      users,
    });
  } catch (error) {
    res.json({
      code: 400,
      message: "Failed!",
    });
  }
};

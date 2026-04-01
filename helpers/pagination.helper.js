module.exports = (objectPagination, query, countUser) => {
  if (query.page) {
    objectPagination.currentPage = parseInt(query.page);
  }
  objectPagination.skip =
    (objectPagination.currentPage - 1) * objectPagination.limitUser;
  const totalPage = Math.ceil(countUser / objectPagination.limitUser);
  objectPagination.totalPage = totalPage;
  return objectPagination;
};

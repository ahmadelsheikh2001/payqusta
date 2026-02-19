module.exports = fn => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

// Also export as a property often expected by destructuring
module.exports.catchAsync = module.exports;

/**
 * Created by 柏然 on 2014/11/11.
 */
var express = require('express');
var router = express.Router();
router.get('/:dir/:file', function (req, res, next) {
  next();
});
module.exports = router;
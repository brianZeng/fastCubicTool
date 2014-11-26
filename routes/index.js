var express = require('express');
var router = express.Router();

router.get('/',require('../src/cfgLoader2'));
router.get('/',require('../src/bssWriter'));
/* GET home page. */
router.get('/', function(req, res) {
  var model=res.locals.cfgModel;
  model.JData=JSON.stringify(model);
  res.render('index',model);
});

module.exports = router;

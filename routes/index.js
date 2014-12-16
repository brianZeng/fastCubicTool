var express = require('express');
var router = express.Router();

router.get('/',require('../src/cfgLoader2'));
if(process.env.DEBUG)
  router.get('/',require('../src/bssWriter'));
/* GET home page. */
router.get('/', function(req, res) {
  var model=res.locals.cfgModel,debug=process.env.DEBUG;
  model.JData=JSON.stringify(model);
  res.render(debug? 'index':'compile',model);
});

module.exports = router;

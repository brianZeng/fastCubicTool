var express = require('express');
var router = express.Router();

router.get('/*',require('../src/cfgLoader2'));
if(process.env.DEBUG){
  router.get('/',require('../src/bssWriter'));
  router.get('/debug/:msg',function(req,res){
    console.log(req.params.msg);
    res.end();
  });
}

/* GET home page. */

router.get('/ori',function(req,res){
  var model=res.locals.cfgModel;
  model.JData=JSON.stringify(model);
  res.render('index',model);
});
router.get('/', function(req, res) {
  var model=res.locals.cfgModel,debug=process.env.DEBUG;
  model.JData=JSON.stringify(model);
  res.render(debug? 'index':'compile',model);
});

module.exports = router;

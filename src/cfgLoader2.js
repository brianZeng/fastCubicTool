/**
 * Created by 柏然 on 2014/11/24.
 */
var fileReader = require('../src/resReader.js'), path = require('path');

function normalizePlace(name,scene,defState){
  var r={name:name,defState:scene.defState||defState,modes:[]},dir=scene.dir;
  delete  scene.defState;
  delete  scene.dir;
  Object.getOwnPropertyNames(scene).forEach(function(key){
    var sceneMode=scene[key],res;
    if(dir)res=sceneMode.res.map(function(p){return path.join(dir,p)});
    else res=sceneMode.res.slice();
    r.modes.push({name:key,res:res,ABK:sceneMode.ABK});
  });
  return r;
}
function normalizeState(name,state){
  var r={
    name:name,
    weights:state.weights||[],
    defLum:state.defLum||1,
    defTem:state.defTem||3000,
    mutable:state.mutable
  };
 var tem=r.tem=state.tem||{};
  tem.min=tem.min||2500;
  tem.max=tem.max||8000;
  tem.step=tem.step||200;
  return r;
}

function readCfg(path){
 return fileReader.readFile(path).then(function(str){
    var cfg=JSON.parse(str),r={title:cfg.title||"Philips",modes:cfg.modes},defState;
   r.states=Object.getOwnPropertyNames(cfg.states).map(function(key){
      return normalizeState(key, cfg.states[key]);
   });
   if(r.states.length==0) r.states=[normalizeState('error',{})];
   defState= r.states[0].name;
   r.scenes=Object.getOwnPropertyNames(cfg.scenes).map(function(key){
     return normalizePlace(key,cfg.scenes[key],defState);
   });
   return r;
  });
}
module.exports=function(req,res,next){
  readCfg('./conf2.json').then(function(cfg){
    res.locals.cfgModel=cfg;
    next();
  },function(e){next(e);});
};

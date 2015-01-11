/**
 * Created by 柏子 on 2015/1/10.
 */
angular.module('br').factory('cfgParser',function parseCfg(){
  var cfg=window.app.cfg,inhStack=[cfg],r={scenes:[]},sceneMap=cfg.scenes,stateMap=cfg.states;
  inhStack[1]={
    ABK:[2,1,1],defTem:3000,dir:'',temMax:5000,temMin:2000,temStep:100,
    mutable:false,weights:1,tems:3000,lums:100,baseTem:3000
  };
  objForEach(sceneMap,cloneScene);
  return r;
  function cloneScene(sceneDef,sceneName){
    var scene={name:sceneName};
    inhStack.unshift(sceneDef);
    inheritPro('defMode',scene,1);
    objForEach(sceneDef.mode,cloneMode,scene.modes=[]);
    inhStack.shift();
    r.scenes.push(scene);
  }
  function cloneMode(modeDef,modeName){
    var mode={name:modeName},dir;
    inhStack.unshift(modeDef);
    inhPros(['ABK','res','dir','baseTem'],mode);
    mode.lgNames=mode.lgNames||mode.res.map(replacePostfix);
    inheritPro('defState',mode,1);
    objForEach(modeDef.state,cloneState,mode.states=[]);
    inhStack.shift();
    dir=mode.dir;
    mode.res=mode.res.map(function(path){return dir+path});
    this.push(mode);
  }
  function cloneState(stateDef,stateName){
    if(typeof stateDef==="string") stateDef=stateMap[stateDef];
    stateDef=stateDef||{};
    var state={name:stateName};
    inhStack.unshift(stateDef);
    inhPros('weights,lums,tems,temMin,temMax,temStep,mutable'.split(','),state);
    inhStack.shift();
    this.push(state);
  }
  function inhPros(pros,target,optional){
    pros.forEach(function(pro){inheritPro(pro,target,optional); });
  }
  function replacePostfix(str){
    return str.substring(0,str.lastIndexOf('.'));
  }
  function inheritPro(proName,target,optional){
    if(target.hasOwnProperty(proName))return;
    for(var i= 0,obj=inhStack[0],value;obj;obj=inhStack[++i])
      if(obj.hasOwnProperty(proName))
        if((value=obj[proName])!==undefined)return target[proName]=value;
    if(!optional)
      throw Error('require:'+proName+' in '+target.name);
  }
  function objForEach(obj,callback,thisObj,arg){
    thisObj=thisObj===undefined? obj:thisObj;
    for(var i= 0,keys=Object.getOwnPropertyNames(obj),key,len=keys.length;i<len;i++)
      callback.apply(thisObj,[obj[key=keys[i]],key,arg]);
  }
});

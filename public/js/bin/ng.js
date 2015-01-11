window.app={
   ngModule:angular.module('br',[]),
   cfg:(function(){
     var input=document.querySelector('#cfg'),src=input.innerHTML;
     return input.innerHTML=''||JSON.parse(src);
   })()
 };
angular.module('br').
  controller('bannerController', ['$scope', 'imgFactory', 'cfgFactory', 'glFactory',
    function ($scope, imgFactory, cfgFactory, glFactory) {
      $scope.waiting = $scope.waitingScene = 0;
      $scope.scenes = cfgFactory.scenes;
      $scope.states = [];
      $scope.modes = [];
      $scope.covering = 1;
      $scope.chooseScene = function (scene) {
        $scope.modes = scene.modes;
        $scope.curScene = scene;
        $scope.chooseMode(findByName(scene.modes, scene.defMode) || scene.modes[0]);
        $scope.waitingScene = 1;
        glFactory.restoreCamera();
        $scope.$root.$broadcast('sceneChange', scene);
      };
      $scope.chooseMode = function (mode) {
        glFactory.setABK.apply(null, mode.ABK);
        $scope.states = mode.states;
        $scope.lgNames = mode.lgNames;
        glFactory.lgNum = mode.res.length;
        $scope.$broadcast('dropTitleChange', {selected: mode.name, role: 'mode', mode: mode});
        $scope.chooseState(findByName(mode.states, mode.defState) || mode.states[0]);
        switchLoading(true);
        imgFactory.$get(mode.res).then(function (imgs) {
          glFactory.imgs = imgs;
          switchLoading(false);
          $scope.covering = 0;
          $scope.waitingScene = 0;
        }, function (data) {
          alert('加载图片失败');
          console.log(data);
        });
      };
      $scope.chooseState = function (state) {
        glFactory.weights = state.weights;
        glFactory.lums = state.lums;
        glFactory.tems = state.tems;
        $scope.$broadcast('stateChange', state);
        $scope.$broadcast('dropTitleChange', {selected: state.name, role: 'state'});
      };
      $scope.$on('selectedChange', function (e, evt) {
        var to = evt.to;
        switch (evt.scope.role) {
          case 'scene':
            return $scope.chooseScene(to);
          case 'mode':
            // evt.scope.iconSrc=to.iconSrc;
            return $scope.chooseMode(to);
          case 'state':
            return $scope.chooseState(to)
        }
      });
      function switchLoading(wait) {
        var evt = wait ? 'beginLoading' : 'endLoading';
        $scope.$broadcast(evt);
        $scope.waiting = wait;
      }

      function findByName(arr, name) {
        for (var i = 0, obj = arr[0]; obj; obj = arr[++i])
          if (obj.name === name)return obj;
      }
    }]);
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

angular.module('br').
  controller('dropController', ['$scope',function ($scope) {
    $scope.toggle=function(){
      $scope.showMenu=!$scope.showMenu;
    };
    $scope.showMenu=false;
    $scope.selectItem = function ($index) {
      var item=$scope.items[$index], from = $scope.selectedItem;
      if (from !== item) {
        $scope.selected = item.name;
        $scope.$emit('selectedChange', {from: from, to: $scope.selectedItem = item, scope: $scope})
      }
      $scope.showMenu=false;
    };
    $scope.$on('dropTitleChange',function(e,evt){
      if(evt.role==$scope.role){
        $scope.selected=evt.selected;
      }
    })
  }]);
angular.module('br').directive('drop',function(){
  return {
    restrict:'EA',
    replace:true,
    scope:{
      iconSrc:'@iconSrc',
      items:'=items',
      selected:'@title',
      role:"@role"
    },
    controller:'dropController',
    template:"<div class='drop' ng-click='toggle();'><div class='dropHeader'>" +
    "<img ng-src='{{iconSrc}}'><p>{{selected}}</p></div>" +
    "<div ng-mouseleave='toggle()' class='menu' ng-show='showMenu&&items&&items.length'>" +
    "<p ng-repeat='item in items' data-item ng-click='selectItem($index);'><b></b>{{item.name}}</p>" +
    "</div>"+
    "</div>"
  }
});
angular.module('br').
  factory('imgFactory',['$q','glFactory','$http',function($q,glFactory,$http){
        var imgChannel={},baseAddr='resources\\',ctx=document.createElement('canvas').getContext('2d'),maxImgSize=glFactory.MAX_TEXTURE_SIZE;
       if(console.postInfo)
        console.postInfo=function(tag,info){
          $http.get('/debug/'+tag+':'+info);
        };
        function checkSize(img){
          var oriH=img.naturalHeight,oriWidth=img.naturalWidth,width,height,cvs;
          if(oriH>maxImgSize||oriWidth>maxImgSize){
            if(oriH>oriWidth){
              height=maxImgSize;
              width=parseInt(maxImgSize/oriH*oriWidth);
            }
            else {
              width=maxImgSize;
              height=parseInt(maxImgSize/oriWidth*oriH);
            }
          }
          else {
            console.log('imgSize:'+oriWidth+'/'+oriH);
            return img;
          }
          cvs=ctx.canvas;
          cvs.height=height;
          cvs.width=width;
          ctx.clearRect(0,0,width,height);
          ctx.drawImage(img,0,0,oriWidth,oriWidth,0,0,width,height);
          var nimg=new Image();
          nimg.src=cvs.toDataURL('image/png');
          console.log('change img size:'+nimg.naturalWidth+'/'+nimg.naturalHeight);
          return nimg;
        }
        function imgPromise(src){
          var d=$q.defer(),img=new Image();
          img.onload=function(){imgChannel[src]=checkSize(img); d.resolve(img)};
          img.onerror=function(e){imgChannel[src]=new Error(e);d.reject(e)};
          img.src=baseAddr+src;
          console.log('begin load img:'+src);
          return d.promise;
        }
        function getImg(src){
          var imgLike=imgChannel[src];
          if(!imgLike) return imgChannel[src]=imgPromise(src);
          else if(imgLike instanceof Image) return $q(function(r){r(imgLike);});
          else if(imgLike instanceof Error) return $q.reject(imgLike);
          return imgLike;
        }
        return {
          $get:function(src){
            if(typeof src=="string") return getImg(src);
            else if(src.map)return $q.all(src.map(function(s){return getImg(s);}));
          },
          setImgSize:function(v){
            if(isNaN(v))return;
             maxImgSize=parseInt(maxImgSize,10);
          }
        }
      }]).
  factory('cfgFactory',['cfgParser',function(cfg){
    return cfg;
  }]);


angular.module('br').
  factory('glFactory',['$rootScope',function($rootScope){
    var domEle=document.domEle = document.documentElement,menu=document.querySelector('body>menu'),
      cvs=document.querySelector('#glcvs'),glPort,state,gl,ex;
    glPort=bgl.pls(cvs, {maxLG: 6,
      normalLocation: {x: 0,get y(){return menu.clientHeight }, get w(){return domEle.clientWidth},get h(){return domEle.clientHeight - menu.clientHeight}}
    });
    gl=cvs.getContext('webgl');
    document.addEventListener('keydown',function(e){
      e.preventDefault();
    });
    cvs.addEventListener('webglcontextlost',function(e){
      console.warn('gl lost context');
      e.preventDefault();
    });
    state={
      weights:[],
      lums:[],
      imgs:[],
      baseTem:3000,
      tems:[],
      lgNum:0
    };
    state.textureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE);
    glPort.onupdate=function(){
      if(state.dirty){
        var imgs=state.imgs,lums=state.lums,weights=state.weights,tems=state.tems;
        if(!$rootScope.$$phase)$rootScope.$digest();
        glPort.reset(state.lgNum);
        for(var i= 0,baseTem= state.baseTem,sum= 0,weight,num=imgs.length;i< num;i++){
          glPort.changeImg(i, imgs[i]);
          glPort.changeIntensity(i,( lums[i]* (weight=weights[i]||0)));
          sum+=weight;
          glPort.changeTem(i, tems[i], baseTem);
        }
        glPort.changeSumIntensity(sum);
        state.dirty=false;
      }
    };
    function invalid(){
      state.dirty=true;
    }
    glPort.reset(0);
    glPort.adjustCanvas(cvs,false);
    document.addEventListener('resize',function(){
      glPort.adjustCanvas(cvs,glPort.expanded);
    });
    window.app.glDebug=glPort.debug;
    window.app.camera=glPort.camera;
    return ex={
      get lgNum(){
        return state.lgNum;
      },
      set lgNum(v){
        v=parseInt(v);
        if(!isNaN(v))
          invalid(state.lgNum=v);
      },
      set baseTem(v){
        if(isNaN(v)||state.baseTem==v)return;
        invalid(state.baseTem=v);
      },
      get baseTem(){
        return state.baseTem;
      },
      get MAX_TEXTURE_SIZE(){
        return state.textureSize;
      },
      set imgs(arr){
        if(arr.every(validImg))
        {
          glPort.reset(arr.length);
          invalid(state.imgs=arr.slice());
        }
        else throw  Error('invalid imgs');
      },
      get weights(){
        return state.weights;
      },
      set weights(v){
        if((v instanceof Array))
         state.weights= v.slice();
        else if(!isNaN(v))
          state.weights=repeatNum(v,ex.lgNum);
        else return;
        invalid();
      },
      get lums(){
        return state.lums.map(function(n){return n*100});
      },
      set lums(v){
        if((v instanceof Array))
          state.lums= v.map(function(l){return l/100;});
        else if(!isNaN(v))
          state.lums=repeatNum(v/100,ex.lgNum);
        else return;
        invalid();
      },
      get tems(){
        return state.tems;
      },
      set tems(v){
        if((v instanceof Array))
          state.tems= v.slice();
        else if(!isNaN(v))
          state.tems=repeatNum(v,ex.lgNum);
        else return;
        invalid();
      },
      setABK:function(A,B,K){
        return glPort.changeABK(A,B,K);
      },
      restoreCamera:glPort.restoreCamera,
      get:function(pro,index){
        return state[pro+'s'][index];
      },
      set:function(pro,index,v){
        if(isNaN(v))return;
        if(pro=='lum')v=v/100;
        if(index==undefined||index==-1)ex[pro]=v;
        else
          state[pro+'s'][index]=v;
        invalid();
      },
      set visible(v){
        glPort.visible=v;
      }
    };
    function repeatNum(number,length){
      for(var i= 0,arr=new Array(length);i<length;i++)
        arr[i]=number;
      return arr;
    }
    function validImg(img){return img instanceof Image && img.complete}
  }]);
angular.module('br').
  controller('multiController',['$scope','glFactory',function($scope,glFactory){
    $scope.mutable=false;
    $scope.values=[];
    $scope.oriTitle=$scope.title;
    $scope.toggle=function(all){
      if(all){
        $scope.onselect(undefined);
        $scope.onchange($scope.value);
      }else
        $scope.showMenu=!$scope.showMenu;
    };
    $scope.getItemValue=function(item){
      return this.values[this.items.indexOf(item)];
    };
    $scope.onselect=function(index){
      $scope.values[$scope.selectedIndex]=$scope.value;
      $scope.selectedIndex=index;
      $scope.title=$scope.items[index];
      $scope.value=$scope.values[index]||0;
    };
    $scope.onchange=function(v){
      var i=$scope.selectedIndex,values;
      v=parseInt(v);
      if(i===undefined){
        $scope.value=(values=$scope.values=$scope.items.map(function(){return v}))[0];
        $scope.title=$scope.oriTitle;
        glFactory[$scope.role+'s']=values;
      }
      else {
        debugger;
        glFactory.set($scope.role,i,$scope.values[i]=v);
      }

    };
    $scope.$on('sceneChange',function(){
      $scope.title=$scope.oriTitle;
      $scope.selectedIndex=undefined;
    });
    $scope.$on('stateChange',function(e,state){
      var role=$scope.role,pros=role+'s';
      $scope.mutable=state.mutable;
      if(role=='tem'){
        $scope.min=state.temMin;
        $scope.max=state.temMax;
        $scope.step=state.temStep;
        glFactory.tems=state.tems;
      }
      else if(role=='lum'){
        $scope.min=0;
        $scope.max=100;
        $scope.step=1;
      }else return;
      glFactory[pros]=state[pros];
      $scope.value=($scope.values=glFactory[pros])[0];
    });
  }]);
angular.module('br').directive('multiRange',function(){
  return{
    restrict:'EA',
    replace:true,
    scope:{
      iconSrc:'@iconSrc',
      title:'@title',
      unit:'@unit',
      value:'@value',
      role:'@role',
      min:'@min',
      max:'@max',
      step:'@step',
      items:'=items'
    },
    controller:'multiController',
    template:"<div class='multi-range'><div class='icon-range dropHeader drop'>" +
    "<img ng-src='{{iconSrc}}' ng-click='toggle(true)'><p ng-click='toggle()'>{{title}}</p>" +
    "<input type='range' ng-model='value' ng-disabled='!mutable'  ng-change='onchange(value)' min='{{min}}' max='{{max}}' step='{{step}}' ng-class=\"{true:'active',false:'inactive'}[mutable]\">" +
    "<p>{{value}}{{unit}}</p></div>" +
    "<div ng-mouseleave='toggle()' class='menu' ng-show='showMenu&&items&&items.length'>" +
    "<p ng-repeat='item in items' data-item ng-click='onselect($index);'><b></b>{{item}}:{{getItemValue(item)}}{{unit}}</p>" +
    "</div>"+
    "</div>"
  }
});
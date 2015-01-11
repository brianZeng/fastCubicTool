/**
 * Created by 柏子 on 2015/1/10.
 */
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
        for(var i= 0,baseTem= state.baseTem,num=imgs.length;i< num;i++){
          glPort.changeImg(i, imgs[i]);
          glPort.changeIntensity(i,( lums[i]* weights[i])||0);
          glPort.changeTem(i, tems[i], baseTem);
        }
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
/**
 * Created by 柏然 on 2014/11/25.
 */
if(window.app)
  (function(module){
    module.
      factory('imgFactory',function($q){
        var imgChannel={},baseAddr='resources\\';
        function imgPromise(src){
          var d=$q.defer(),img=new Image();
          img.onload=function(){imgChannel[src]=img; d.resolve(img)};
          img.onerror=function(e){imgChannel[src]=new Error(e);d.reject(e)};
          img.src=baseAddr+src;
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
          }
        }
      }).
      factory('cfgFactory',function(){
        return window.app.cfg;
      }).
      factory('glFactory',function(){
         var domEle=document.domEle = document.documentElement,menu=document.querySelector('body>menu'),
           cvs=document.querySelector('#glcvs'),glPort=bgl.pls(cvs, {maxLG: 6,
           normalLocation: {x: 0,get y(){return menu.clientHeight }, get w(){return domEle.clientWidth},get h(){return domEle.clientHeight - menu.clientHeight}}
         }),state={weights:[],imgs:[],baseTem:window.app.cfg.baseTem||3000};
        glPort.onupdate=function(){
          if(state.dirty){
            var weights=state.weights,imgs=state.imgs,num=Math.min(imgs.length,weights.length),lum=state.lum,tem=state.tem,
              baseTem=state.baseTem;
            glPort.reset(num);
            for(var i= 0;i<num;i++){
              glPort.changeImg(i,imgs[i]);
              glPort.changeIntensity(i,lum*weights[i]);
              glPort.changeTem(i,tem,baseTem);
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
        return {
          get tem(){
            return state.tem;
          },
          set baseTem(v){
            if(isNaN(v)||state.baseTem==v)return;
            invalid(state.baseTem=v);
          },
          get baseTem(){
            return state.baseTem;
          },
          set tem(v){
            if(isNaN(v)||state.tem==v)return;
            invalid(state.tem=v);
          },
          get lum(){return state.lum;},
          set lum(v){
            if(state.lum==v||isNaN(v))return;
            invalid(state.lum=v);
          },
          set imgs(arr){
            if(arr.every(function(img){return img instanceof Image && img.complete}))
              return invalid(state.imgs=arr.slice());
            throw  Error('invalid imgs');
          },
          setABK:function(A,B,K){
            return glPort.changeABK(A,B,K);
          },
          setWeights:function(weights){
            return invalid(state.weights=weights.slice());
          },
          set visible(v){
            glPort.visible=v;
          }
        }
      });
  })(window.app.ngModule);



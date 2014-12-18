/**
 * Created by 柏然 on 2014/11/25.
 */
(function(module){
    module.
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
      factory('cfgFactory',function(){
        return window.app.cfg;
      }).
      factory('glFactory',function(){
         var domEle=document.domEle = document.documentElement,menu=document.querySelector('body>menu'),
           cvs=document.querySelector('#glcvs'),glPort,state,gl;
       glPort=bgl.pls(cvs, {maxLG: 6,
           normalLocation: {x: 0,get y(){return menu.clientHeight }, get w(){return domEle.clientWidth},get h(){return domEle.clientHeight - menu.clientHeight}}
         });
        gl=cvs.getContext('webgl');
        cvs.addEventListener('webglcontextlost',function(e){
          console.warn('gl lost context');
          e.preventDefault();
        });
        state={weights:[],imgs:[],baseTem:window.app.cfg.baseTem||3000,tems:[]};
        console.log(state.textureSize=gl.getParameter(gl.MAX_TEXTURE_SIZE));
        //state.textureSize=2048;
        glPort.onupdate=function(){
          if(state.dirty){
            var weights=state.weights,imgs=state.imgs,num=Math.min(imgs.length,weights.length),lum=state.lum,tems=state.tems,
              baseTem=state.baseTem;
            glPort.reset(num);
            for(var i= 0;i<num;i++){
              glPort.changeImg(i,imgs[i]);
              glPort.changeIntensity(i,lum*weights[i]);
              glPort.changeTem(i,tems[i],baseTem);
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
          get MAX_TEXTURE_SIZE(){
            return state.textureSize;
          },
          set tem(v){
            if(isNaN(v=parseInt(v)))return;
            invalid(state.tems=state.imgs.map(function(){return v}));
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
          set w0(v){
           state.weights[0]=parseFloat(v)/100||0;
           state.lum=1;
           invalid();
         },
          set w1(v){
            state.weights[1]=parseFloat(v)/100||0;
            state.lum=1;
            invalid();
          },
          restoreCamera:glPort.restoreCamera,
          getWeight:function(i){return state.weights[i]*100},
          setTem:function(i,v){
            if(i==undefined) return this.tem=v;
            if(isNaN(v=parseInt(v)))return;
            invalid(state.tems[i]=v);
          },
          setWight:function(i,v){
            if(isNaN(v))return;
            if(i==undefined)state.weights=state.imgs.map(function(){return v});
            invalid(state.weights[i]=v);
          },
          setWeights:function(weights){
            return invalid(state.weights=weights.slice());
          },
          set visible(v){
           // debugger;
            glPort.visible=v;
          }
        }
      });
  })(window.app.ngModule);



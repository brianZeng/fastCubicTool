/**
 * Created by 柏然 on 2014/11/25.
 */

  (function(module){
    function findByName(arr,name){
      for(var i= 0,obj=arr[0];obj;obj=arr[++i])
       if(obj.name===name)return obj;
    }
    module.controller('bannerController', ['$scope','$timeout','imgFactory','cfgFactory','glFactory',function ($scope,$timeout, imgFactory,cfgFactory,glFactory) {
        $scope.waiting = $scope.waitingScene=0;
        $scope.scenes=cfgFactory.scenes;
        $scope.states=cfgFactory.states;
        $scope.covering=1;
      //  $scope.lgNames=['a','b','c'];
       function switchLoading(wait){
          var evt=wait? 'beginLoading':'endLoading';
          $scope.$broadcast(evt);
          $scope.waiting=wait;
        }
        $scope.chooseScene=function(scene){
          $scope.modes=scene.modes;
          $scope.curScene=scene;
          $scope.chooseState(findByName($scope.states,scene.defState));
          $scope.chooseMode(findByName(scene.modes,scene.defMode));
          $scope.waitingScene=1;
          glFactory.restoreCamera();
        };
        $scope.chooseMode=function(mode){
          if(!$scope.curScene)return;
          var sceneMode=findByName($scope.curScene.modes,mode.name);
          glFactory.setABK.apply(null,sceneMode.ABK);
          switchLoading(true);
          $scope.$broadcast('dropTitleChange',{selected:mode.name,role:'mode',modeDef:cfgFactory.modes[mode.name]});
          $scope.lgNames=sceneMode.lgNames;
          imgFactory.$get(sceneMode.res).then(function(imgs){
            glFactory.imgs=imgs;
            switchLoading(false);
            $scope.covering=0;
            $scope.waitingScene=0;
          },function(data){
            alert('加载图片失败');
            console.log(data);
          });
        };
        $scope.chooseState=function(state){
          glFactory.setWeights(state.weights);
          glFactory.lum=state.defLum/100;
          glFactory.tem=state.defTem;
          $scope.$broadcast('stateChange',state);
          $scope.$broadcast('dropTitleChange',{selected:state.name,role:'state'});
        };
        $scope.$on('selectedChange',function(e,evt){
          var to=evt.to;
          switch (evt.scope.role)
          {
            case 'scene':
              return $scope.chooseScene(to);
            case 'mode':
              evt.scope.iconSrc=to.iconSrc;
              return $scope.chooseMode(to);
            case 'state':
              return $scope.chooseState(to)
          }
        });
        $timeout(function(){
         // if($scope.scenes[0])
         //   $scope.chooseScene($scope.scenes[0]);
        });
    }]).
      controller('dropController', ['$scope',function ($scope) {
        $scope.toggle=function(state){
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
          var role=$scope.role;
          if(evt.role==$scope.role){
            $scope.selected=evt.selected;
            if(role=='mode'&&evt.modeDef)$scope.iconSrc=evt.modeDef.iconSrc;
          }
        })
      }]).
      controller('rangeController',['$scope','glFactory',function($scope,glFactory){
          $scope.mutable=false;
          $scope.onchange=function(v){
           var role=$scope.role;
            if(role=='lum')v=v/100;
            glFactory[$scope.role]=v;
          };
          $scope.$on('stateChange',function(e,state){
            var role=$scope.role;
            $scope.mutable=state.mutable;
            if(role=='tem'){
              var tem=state.tem;
              $scope.min=tem.min;
              $scope.max=tem.max;
              $scope.step=tem.step;
              $scope.value=state.defTem;
            }
            else if(role=='lum')
              $scope.value=state.defLum;
            else if(role=='w0') $scope.value=state.weights[0]*100;
            else if(role=='w1') $scope.value=state.weights[1]*100;
          });
      }]).
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
         $scope.onselect=function(index){
           $scope.values[$scope.selectedIndex]=$scope.value;
           $scope.selectedIndex=index;
           $scope.title=$scope.items[index];
           $scope.value=$scope.values[index]||0;
         };
         $scope.onchange=function(v){
           var role=$scope.role,i=$scope.selectedIndex;
           v=parseInt(v);
           if(i===undefined){
             $scope.value=($scope.values=$scope.items.map(function(){return v}))[0];
             $scope.title=$scope.oriTitle;
           }
           if(role=='weight')
             glFactory.setWight(i,v/100);
           else if(role=='tem')
             glFactory.setTem(i,v);
         };
        $scope.$on('stateChange',function(e,state){
          var role=$scope.role,value;
          $scope.mutable=state.mutable;
          if(role=='tem'){
            var tem=state.tem;
            $scope.min=tem.min;
            $scope.max=tem.max;
            $scope.step=tem.step;
            value=$scope.value=state.defTem;
            $scope.values=state.weights.map(function(){return value;});
          }
          else if(role=='weight'){
            $scope.min=0;
            $scope.max=100;
            $scope.step=1;
            $scope.value=($scope.values=state.weights.map(function(w){return w*100;}))[0];
          }

        });
      }]);

  })(window.app.ngModule);

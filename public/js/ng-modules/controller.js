/**
 * Created by 柏然 on 2014/11/25.
 */
if (window.app) {
  (function(module){
    function findByName(arr,name){
      for(var i= 0,obj=arr[0];obj;obj=arr[++i])
       if(obj.name===name)return obj;
    }
    module.controller('bannerController', function ($scope, imgFactory,cfgFactory,glFactory) {
        $scope.waiting = 0;
        $scope.scenes=cfgFactory.scenes;
        $scope.states=cfgFactory.states;
        function switchLoading(wait){
          var evt=wait? 'beginLoading':'endLoading';
          $scope.$broadcast(evt);
          $scope.waiting=wait;
        }
        $scope.chooseScene=function(scene){
          $scope.modes=scene.modes;
          $scope.curScene=scene;
          $scope.chooseState(findByName($scope.states,scene.defState));
          $scope.chooseMode(scene.modes[0]);
        };
        $scope.chooseMode=function(mode){
          if(!$scope.curScene)return;
          var sceneMode=findByName($scope.curScene.modes,mode.name);
          glFactory.setABK.apply(null,sceneMode.ABK);
          switchLoading(true);
          $scope.$broadcast('dropTitleChange',{selected:mode.name,role:'mode'});
          imgFactory.$get(sceneMode.res).then(function(imgs){
            glFactory.imgs=imgs;
            switchLoading(false);
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
    }).
      controller('dropController', function ($scope) {
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
           if(evt.role==$scope.role)
             $scope.selected=evt.selected;
        })
      }).
      controller('rangeController',function($scope,glFactory){
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
          });
      });

  })(window.app.ngModule);

}
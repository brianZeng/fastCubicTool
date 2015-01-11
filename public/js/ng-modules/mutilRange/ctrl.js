/**
 * Created by 柏子 on 2015/1/11.
 */
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
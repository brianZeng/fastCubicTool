/**
 * Created by 柏子 on 2015/1/11.
 */
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
        imgFactory.get(mode.res).then(function (imgs) {
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
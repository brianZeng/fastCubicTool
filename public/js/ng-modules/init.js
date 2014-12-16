/**
 * Created by 柏然 on 2014/11/25.
 */
 window.app={
   ngModule:angular.module('br',[]),
   cfg:(function(){
     var input=document.querySelector('#cfg'),src=input.value;
     return input.value=''||JSON.parse(src);
   })()
 };
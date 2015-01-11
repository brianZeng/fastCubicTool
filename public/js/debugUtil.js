/**
 * Created by 柏然 on 2014/12/17.
 */
(function(console){
  var cache={},iframe=document.createElement('debug');
  window.addEventListener('error',function(e){
    addInfo('error',[e]);
  });
  iframe.style.display='none';
  document.addEventListener('DOMContentLoaded',function(){
    document.body.appendChild(iframe);
  });
  console.postInfo=function(tag,msg){};
  function addInfo(tage,args){
    var i=document.createElement(tage);
    iframe.appendChild(i);
    i.innerHTML=Array.prototype.slice.apply(args).join(';');
    console.postInfo(tage, i.innerHTML);
  }
  'log,warn,error'.split(',').forEach(function(name){
    var oriFunc=console[name],arr=cache[name]=[];
    console[name]=function(){
       arr.push(arguments);
       addInfo(name,arguments);
       oriFunc.apply(console,arguments);
    }
  });
  console.getRecord=function(type,i){
    type=type||'log';
    var arr=cache[type];
    return arr[i]||arr;
  }
})(console);
/**
 * Created by 柏然 on 2014/11/11.
 */
var fs=require('fs'),Promise=require('bluebird'),asyncFS=Promise.promisifyAll(fs),path=require('path');
var opt={
  resDir:path.normalize('public/resources')
};
function readDirFilesPromise(dirPath){
  var defer=Promise.defer();
  fs.readdir(dirPath,function(error,names){
    return error? defer.reject(error):defer.resolve(names.map(function(name){return dirPath+name}));
  });
  return defer.promise.then(readFilesPromise);
}
function readFilePromise(filePath,opt){
  return asyncFS.readFileAsync(path.normalize(filePath),opt||'utf8');
}
function readDir(dir){
 return asyncFS.readdirAsync(path.normalize(dir));
}
function fstate(dir,file){
  var d=Promise.defer();
  fs.fstat(path.join(dir,file),function(){

  });
  return d.promise;
}
module.exports={
  readDir:readDir,
  readResSubDirs:function(){
    var defer=Promise.defer(),dirs=[];
    readDir(opt.resDir).then(function(files){
      return Promise.all(files.map(function(name){return asyncFS.statAsync(path.join(opt.resDir,name))})).then(function(states){
        states.forEach(function(s,i){ if(s.isDirectory())dirs.push({name:files[i]});});
        return Promise.all(dirs.map(function(dir){return asyncFS.readdirAsync(path.join(opt.resDir,dir.name))}));
      }).then(function(dirFiles){
        dirFiles.forEach(function(files,i){dirs[i].files=files;});
        defer.resolve(dirs);
      },function(e){defer.reject(e);})
    });
    return defer.promise;
  },
  readFile:readFilePromise,
  readDirFiles:function(dir){
    var dp=path.normalize(dir);
    return readDir(dir).then(function(files){
      return Promise.all(files.map(function(name){return readFilePromise(path.join(dp,name))}));
    });
  }
};
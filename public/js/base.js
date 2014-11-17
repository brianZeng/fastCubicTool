/**
 * Created by 柏然 on 14-1-23.
 */
window.requestAFrame = (function () {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    function (callback) {
      return window.setTimeout(callback, 1000 / 60); // shoot for 60 fps
    };
})();
Array.prototype.desInsert = function (item, proName) {
  if (this.indexOf(item) >= 0)return false;
  if (!this.length) {
    this.push(item);
    return true;
  }
  for (var i = 0, it = this[0], index = 0; it; it = this[++i])
    if (item[proName] >= it[proName])break;
    else index++;
  if (this[index + 1] && this[index][proName] < this[index + 1][proName]) {
    this.push(item);
    this.des(proName);
  }
  else
    this.splice(index, 0, item);
  return true;
};
Array.prototype.ascInsert = function (item, proName) {
  if (this.indexOf(item) >= 0)return false;
  if (!this.length) {
    this.push(item);
    return true;
  }
  for (var i = 0, it = this[0], index = 0; it; it = this[++i])
    if (item[proName] <= it[proName])break;
    else index++;
  if (this[index + 1] && this[index][proName] > this[index + 1][proName]) {
    this.push(item);
    this.des(proName);
  }
  else
    this.splice(index, 0, item);
  return true;
};
Array.prototype.max = function (propertyName) {
  if (typeof propertyName == "function") {
    var m = propertyName(this[0]);
    this.forEach(function (e) {
      var v = propertyName(e);
      if (v > e) m = v;
    });
  }
  else {
    var m = this[0][propertyName];
    this.forEach(function (e) {
      if (e[propertyName] > m)m = e[propertyName];
    });
  }
  return m;
};
Array.prototype.min = function (propertyName) {
  if (typeof propertyName == "function") {
    var m = propertyName(this[0]);
    this.forEach(function (e) {
      var v = propertyName(e);
      if (v < e) m = v;
    });
  }
  else {
    var m = this[0][propertyName];
    this.forEach(function (e) {
      if (e[propertyName] < m)m = e[propertyName];
    });
  }
  return m;
};
Array.prototype.remove = function (item) {
  var i = this.indexOf(item);
  if (i >= 0) {
    this.splice(i, 1);
    return true;
  }
  return false;
};
Array.prototype.add = function (item) {
  var i = this.indexOf(item);
  if (i < 0) {
    this.push(item);
    return true;
  }
  return false;
};
Array.prototype.des = function (proName) {
  this.sort(function (a, b) {
    if (a[proName] > b[proName])
      return -1;
    else
      return 1;
  });
};
Array.prototype.asc = function (proName) {
  this.sort(function (a, b) {
    if (a[proName] < b[proName])
      return -1;
    else
      return 1;
  });
};
Array.prototype.findBy = function (proName, value) {
  for (var i = 0, item = this[0]; item; item = this[++i])
    if (item[proName] === value) return item;
  return null;
};
Array.prototype.clone = function () {
  for (var i = 0, item = this[0], r = []; item; item = this[++i])
    if (item.clone)r.push(item.clone());
    else return null;
  return r;
};
Array.prototype.clone = function (array) {
  for (var i = 0, item = array[0]; item; item = array[++i])
    if (item.clone)this.push(item.clone(item));
    else return null;
  return this;
};
Boolean.prototype.toFloat = function () {
  return this ? 1 : 0;
};
String.prototype.format = function () {
  var res = arguments;
  return this.replace(/\{\d+?\}/g, function (a) {
    return res[parseInt(a.substr(1, a.length - 2))] || (res[parseInt(a.substr(1, a.length - 2))] === '' ? '' : a);
  });
};
Object.prototype.addProperty = function (args, invalid) {
  if (typeof (args) == 'string') args = {privateName: '_' + args, publicName: args};
  else if (!args.privateName) args.privateName = '_' + args.publicName;
  args.invalid = (invalid !== false);
  var options = {enumerable: false, configurable: true};
  if (args.get !== false)
    if (typeof (args.get) != 'function')
      options.get = new Function('return this.' + args.privateName + ';');
    else
      options.get = args.get;
  if (args.set !== false)
    if (typeof (args.set) != "function")
      options.set = new Function('val', ('var o=this.{0};if(o!==val)this.{0}=val;this.notify("{1}",o);'
        .format(args.privateName, args.publicName) + (args.invalid ? 'this.invalid();' : '')));
    else
      options.set = args.set;
  Object.defineProperty(this, args.publicName, options);
  return this;
};
Object.prototype.toInt = function () {
  var i = parseInt(this);
  if (isNaN(i))return undefined;
  else return i;
};
Object.prototype.toFloat = function () {
  var i = parseFloat(this);
  if (isNaN(i))return undefined;
  else return i;
};
Object.prototype.on = function (evtName, handler) {
  if (typeof evtName !== "string" || !evtName || typeof handler != "function")return this;
  var cbs = this._callbacks, hs;
  if (!cbs)this._callbacks = cbs = {};
  hs = cbs[evtName];
  if (!hs)cbs[evtName] = [handler];
  else hs.add(handler);
  return this;
};
Object.prototype.emit = function (evtName, argArray, thisObj) {
  var cbs = this._callbacks, hs;
  if (!cbs)return true;
  hs = cbs[evtName];
  if (!hs)return true;
  if (!(argArray instanceof Array)) argArray = [argArray];
  thisObj = thisObj || this;
  cbs[evtName] = hs.filter(function (call) {
    return call.apply(thisObj, argArray) != -1;
  });
  return true;
};
Object.prototype.toBool = function () {
  return this == true;
};
Object.prototype.allOwnPros = function (f) {
  for (var i = 0, names = Object.getOwnPropertyNames(this), name = names[0]; name; name = names[++i])
    f.apply(this, [this[name], name]);
};
Object.defer = window.Q ? Q.defer : (function () {
  function enqueue(callback) {
    setTimeout(callback, 1);
  }

  function defer() {
    var pending = [], value, d = Object.create(defer.prototype);
    d.resolve = function (_value) {
      if (pending) {
        value = promise(_value);
        for (var i = 0, ii = pending.length; i < ii; i++)
          value.then.apply(value, pending[i]);
        pending = undefined;
      }
    };
    d.reject = function (reason) {
      d.resolve(reject(reason))
    };
    d.promise = {
      then: function (_callback, _errback) {
        var result = defer();
        _callback = _callback || function (value) {
          return value;
        };
        _errback = _errback || function (reason) {
          return reject(reason);
        };
        var callback = function (value) {
          result.resolve(_callback(value));
        };
        var errback = function (reason) {
          result.resolve(_errback(reason));
        };
        if (pending) pending.push([callback, errback]);
        else  enqueue(function () {
          value.then(callback, errback);
        });
        return result.promise;
      }
    };
    return d;
  }

  function promise(value) {
    if (value instanceof  promise)return value;
    var p = Object.create(promise.prototype);
    p.then = function (callback) {
      var result = defer();
      enqueue(function () {
        result.resolve(callback(value));
      });
      return result.promise;
    };
    return p;
  }

  function reject(reason) {
    var p = Object.create(promise.prototype);
    p.then = function (callback, errback) {
      var result = defer();
      enqueue(function () {
        result.resolve(errback(reason));
      });
      return result.promise;
    };
    return p;
  }

  return defer;
})();
Math.log2 = Math.log2 || function (val) {
  return Math.log(val) * Math.LOG2E;
};
Math.isInt = function (x) {
  var y = parseInt(x, 10);
  return !isNaN(y) && x == y && x.toString() == y.toString();
};
Function.prototype.inherit = function (objPrototype, proArray, baseConstructor) {
  var base = Object.create(baseConstructor ? new baseConstructor() : {});
  for (var p in objPrototype) base[p] = objPrototype[p];
  proArray.forEach(function (p) {
    base.addProperty(p);
  });
  this.prototype = base;
  return this;
};



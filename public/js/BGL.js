var bgl = {
  init: function (canvas) {
    var cfg, gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || WebGLRenderingContext;
    cfg = new this.GlConfig(gl);
    if (bgl.event)
      cfg.eventPool = bgl.event.getEventPool(canvas);
    gl.cfg = cfg;
    return gl;
  },
  GlConfig: function (gl) {
    gl.cfg = this;
    this.gl = gl;
    this._program = null;
    this.resManager = new bgl.resource.ResourceManager(this);
    this.scenes = [];
    this.state = {enable: 1};
  },
  createProgram: function (gl, vSource, fSource) {
    var program = gl.createProgram(), shader = gl.createShader(gl.FRAGMENT_SHADER), error;
    vSource = typeof vSource == "string" ? vSource : vSource.innerHTML;
    fSource = typeof fSource == "string" ? fSource : fSource.innerHTML;
    gl.shaderSource(shader, fSource);
    gl.compileShader(shader);
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      error = gl.getShaderInfoLog(shader);
      console.log('fshader Failed to compile shader: ' + error);
    }
    gl.attachShader(program, shader);
    shader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(shader, vSource);
    gl.compileShader(shader);
    compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      error = gl.getShaderInfoLog(shader);
      console.log('vshader Failed to compile shader: ' + error);
    }
    gl.attachShader(program, shader);
    gl.linkProgram(program);
    program.gl = gl;
    program.attributes = this._getAttributeEntries(gl, program, vSource);
    program.uniforms = this._getUniformEntries(gl, program, vSource, fSource);
    return program;
  },
  _getUniformEntries: function (gl, program, vSource, fSource) {
    var u = {}, match, loc, nrg = /\buniform\s+(vec[234]|float|sampler2D|samplerCube|mat[234])\s+\b(\w+)\b\s?;/gm;
    while ((match = nrg.exec(vSource + fSource))) {
      loc = gl.getUniformLocation(program, match[2]);
      if (loc == -1) throw 'get uniform failed';
      u[match[2]] = new bgl.foundation.UniformEntry(match[1], loc, program);
    }
    return u;
  },
  _getAttributeEntries: function (gl, program, vSource) {
    var u = {}, loc, match, nrg = /\battribute\s+(vec[234]|float)\s+\b(\w+)\b\s?;/gm;
    while ((match = nrg.exec(vSource))) {
      loc = gl.getAttribLocation(program, match[2]);
      if (loc == -1) throw 'get attribute failed';
      u[match[2]] = new bgl.foundation.AttributeEntry(match[1], loc, program);
    }
    /*if (matches)
     for (var i = 0, len = matches.length, loc, name; i < len; i++) {
     words = matches[i].split(' ');
     name = words[2].replace(';', '');
     loc = gl.getAttribLocation(program, name);
     if (loc==-1) throw Error('get uniform fail');
     u[name] = new bgl.foundation.AttributeEntry(words[1], loc, program);
     }*/
    return u;
  }
};
bgl.GlConfig.prototype = {
  get nextScene() {
    return this.state._nextScene;
  },
  set nextScene(scene) {
    if (scene && scene instanceof bgl.model.Scene && scene !== this.curScene)
      this.state._nextScene = scene;
  },
  set curScene(scene) {
    var curScene = this.curScene;
    if (!(scene instanceof bgl.model.Scene) || curScene === scene)return;
    this.state._scene = scene;
    if (curScene) curScene._timeline.stop();
    scene._timeline.start();
  },
  get curScene() {
    return this.state._scene;
  },
  set curRender(render) {
    this.state._render = render;
  },
  get curRender() {
    return this.state._render;
  },
  get curFrameBuffer() {
    return this.resManager._bindingFrameBuffer;
  },
  set curFrameBuffer(frameBuffer) {
    if (frameBuffer)
      frameBuffer.bind(this.gl);
    else
      this.resManager.bindingFrameBuffer = frameBuffer;
  },
  set curProgram(program) {
    if (!program || program === this._program)return;
    this.gl.useProgram(program);
    this.state._program = program;
  },
  get curProgram() {
    return this.state._program;
  },
  set curGeometry(geo) {
    this.state._geometry = geo;
  },
  get curGeometry() {
    return  this.state._geometry;
  },
  get curCamera() {
    return this.curScene.camera;
  },
  get width() {
    return this.gl.drawingBufferWidth;
  },
  get height() {
    return this.gl.drawingBufferHeight;
  },
  set width(v) {
    v = parseInt(v);
    if (!v && v === this.width)return;
    var gl = this.gl, curScene = this.curScene, h = this.height, curfb = this.curFrameBuffer;
    gl.canvas.width = v;
    gl.viewport(0, 0, v, h);
    if (curScene) {
      curScene.camera.aspect = v / h;
      curScene.invalid();
    }
    if (curfb)curfb.width = v;
  },
  set height(v) {
    v = parseInt(v);
    if (!v && v === this.height)return;
    var gl = this.gl, curScene = this.curScene, w = this.width, curfb = this.curFrameBuffer;
    gl.canvas.height = v;
    gl.viewport(0, 0, w, v);
    if (curScene) {
      curScene.camera.aspect = w / v;
      curScene.invalid();
    }
    if (curfb)curfb.height = v;
  },
  set enable(e) {
    this.state.enable = !!e;
  },
  get enable() {
    return this.state.enable;
  },
  glClear: function (depth, stencil) {
    var gl = this.gl, bit = gl.COLOR_BUFFER_BIT;
    if (depth) bit |= gl.DEPTH_BUFFER_BIT;
    if (stencil)  bit |= gl.STENCIL_BUFFER_BIT;
    gl.clear(bit);
  },
  update: function (cfg) {
    this.curScene = this.nextScene;
    if (this.eventPool)this.eventPool.update(cfg);
    this.emit('update', [cfg]);
  },
  run: function () {
    if (this.enable) {
      this.update(this);
      var s = this.curScene, gl = this.gl;
      if (s) s.render(gl, this);
    }
    window.requestAnimationFrame(this.run.bind(this), gl.canvas);
  },
  add: function (scene) {
    if (scene instanceof bgl.model.Scene) {
      if (scene.order == -1) scene.order = this.scenes.length;
      var b = this.scenes.ascInsert(scene, 'order');
      if (b) {
        scene.cfg = this;
        if (!this.curScene && !this.nextScene)
          this.nextScene = scene;
      }
    }
    return this;
  },
  remove: function (scene, keepAlive) {
    if (this.scenes.remove(scene)) {
      if (!keepAlive) scene.dispose(this.cfg);
      scene.cfg = null;
    }
    return this;
  }
};
bgl.math = {
  Matrix4: function (arrayOrMat4) {
    var i, s, d;
    if (arrayOrMat4) {
      d = new Float32Array(16);
      if (arrayOrMat4.elements)
        s = arrayOrMat4.elements;
      else s = arrayOrMat4;
      for (i = 0; i < 16; i++)
        d[i] = s[i];
    }
    this.elements = d || new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  },
  Matrix3: function (arrayOrMat3) {
    var i, s, d;
    if (arrayOrMat3) {
      d = new Float32Array(9);
      if (arrayOrMat3.elements)
        s = arrayOrMat3.elements;
      else s = arrayOrMat3;
      for (i = 0; i < 16; i++)
        d[i] = s[i];
    }
    this.elements = d || new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  },
  Vector3: function (xOrVec3, y, z) {
    var v = xOrVec3, x;
    if (typeof v == "object") {
      x = v.x;
      y = v.y;
      z = v.z;
    }
    else
      x = xOrVec3;
    this.elements = new Float32Array([x || 0, y || 0, z || 0]);
  },
  Vector4: function (xOrVec4, y, z, w) {
    var v = xOrVec4, x;
    if (typeof v == "object") {
      x = v.x;
      y = v.y;
      z = v.z;
      w = v.w;
    }
    else
      x = xOrVec4;
    this.elements = new Float32Array([x || 0, y || 0, z || 0, w || 0]);
  }
};
bgl.math.static = {
  Matrix4: {
    setScale: function (x, y, z) {
      return new bgl.math.Matrix4([x || 1, 0, 0, 0, 0, y || 1, 0, 0, 0, 0, z || 1, 0, 0, 0, 0, 1]);
    },
    setTranslate: function (x, y, z) {
      return new bgl.math.Matrix4([1, 0, 0, x || 0, 0, 1, 0, y || 0, 0, 0, 1, z || 0, 0, 0, 0, 1]);
    },
    setRotate: function (angle, x, y, z) {
      var e, s, c, len, rlen, nc, xy, yz, zx, xs, ys, zs, mat4 = new bgl.math.Matrix4();
      angle = Math.PI * angle / 180;
      e = mat4.elements;
      s = Math.sin(angle);
      c = Math.cos(angle);
      if (0 !== x && 0 === y && 0 === z) {
        if (x < 0)
          s = -s;
        e[0] = 1;
        e[4] = 0;
        e[ 8] = 0;
        e[12] = 0;
        e[1] = 0;
        e[5] = c;
        e[ 9] = -s;
        e[13] = 0;
        e[2] = 0;
        e[6] = s;
        e[10] = c;
        e[14] = 0;
        e[3] = 0;
        e[7] = 0;
        e[11] = 0;
        e[15] = 1;
      } else if (0 === x && 0 !== y && 0 === z) {
        if (y < 0)
          s = -s;
        e[0] = c;
        e[4] = 0;
        e[ 8] = s;
        e[12] = 0;
        e[1] = 0;
        e[5] = 1;
        e[ 9] = 0;
        e[13] = 0;
        e[2] = -s;
        e[6] = 0;
        e[10] = c;
        e[14] = 0;
        e[3] = 0;
        e[7] = 0;
        e[11] = 0;
        e[15] = 1;
      } else if (0 === x && 0 === y && 0 !== z) {
        if (z < 0)
          s = -s;
        e[0] = c;
        e[4] = -s;
        e[ 8] = 0;
        e[12] = 0;
        e[1] = s;
        e[5] = c;
        e[ 9] = 0;
        e[13] = 0;
        e[2] = 0;
        e[6] = 0;
        e[10] = 1;
        e[14] = 0;
        e[3] = 0;
        e[7] = 0;
        e[11] = 0;
        e[15] = 1;
      } else {
        len = Math.sqrt(x * x + y * y + z * z);
        if (len !== 1) {
          rlen = 1 / len;
          x *= rlen;
          y *= rlen;
          z *= rlen;
        }
        nc = 1 - c;
        xy = x * y;
        yz = y * z;
        zx = z * x;
        xs = x * s;
        ys = y * s;
        zs = z * s;
        e[ 0] = x * x * nc + c;
        e[ 1] = xy * nc + zs;
        e[ 2] = zx * nc - ys;
        e[ 3] = 0;
        e[ 4] = xy * nc - zs;
        e[ 5] = y * y * nc + c;
        e[ 6] = yz * nc + xs;
        e[ 7] = 0;
        e[ 8] = zx * nc + ys;
        e[ 9] = yz * nc - xs;
        e[10] = z * z * nc + c;
        e[11] = 0;
        e[12] = 0;
        e[13] = 0;
        e[14] = 0;
        e[15] = 1;
      }
      return mat4;
    },
    setInverseOf: function (other) {
      var i, s, tx, inv, det, e;
      s = other.elements;
      tx = new bgl.math.Matrix4();
      e = tx.elements;
      inv = new Float32Array(16);

      inv[0] = s[5] * s[10] * s[15] - s[5] * s[11] * s[14] - s[9] * s[6] * s[15]
        + s[9] * s[7] * s[14] + s[13] * s[6] * s[11] - s[13] * s[7] * s[10];
      inv[4] = -s[4] * s[10] * s[15] + s[4] * s[11] * s[14] + s[8] * s[6] * s[15]
        - s[8] * s[7] * s[14] - s[12] * s[6] * s[11] + s[12] * s[7] * s[10];
      inv[8] = s[4] * s[9] * s[15] - s[4] * s[11] * s[13] - s[8] * s[5] * s[15]
        + s[8] * s[7] * s[13] + s[12] * s[5] * s[11] - s[12] * s[7] * s[9];
      inv[12] = -s[4] * s[9] * s[14] + s[4] * s[10] * s[13] + s[8] * s[5] * s[14]
        - s[8] * s[6] * s[13] - s[12] * s[5] * s[10] + s[12] * s[6] * s[9];

      inv[1] = -s[1] * s[10] * s[15] + s[1] * s[11] * s[14] + s[9] * s[2] * s[15]
        - s[9] * s[3] * s[14] - s[13] * s[2] * s[11] + s[13] * s[3] * s[10];
      inv[5] = s[0] * s[10] * s[15] - s[0] * s[11] * s[14] - s[8] * s[2] * s[15]
        + s[8] * s[3] * s[14] + s[12] * s[2] * s[11] - s[12] * s[3] * s[10];
      inv[9] = -s[0] * s[9] * s[15] + s[0] * s[11] * s[13] + s[8] * s[1] * s[15]
        - s[8] * s[3] * s[13] - s[12] * s[1] * s[11] + s[12] * s[3] * s[9];
      inv[13] = s[0] * s[9] * s[14] - s[0] * s[10] * s[13] - s[8] * s[1] * s[14]
        + s[8] * s[2] * s[13] + s[12] * s[1] * s[10] - s[12] * s[2] * s[9];

      inv[2] = s[1] * s[6] * s[15] - s[1] * s[7] * s[14] - s[5] * s[2] * s[15]
        + s[5] * s[3] * s[14] + s[13] * s[2] * s[7] - s[13] * s[3] * s[6];
      inv[6] = -s[0] * s[6] * s[15] + s[0] * s[7] * s[14] + s[4] * s[2] * s[15]
        - s[4] * s[3] * s[14] - s[12] * s[2] * s[7] + s[12] * s[3] * s[6];
      inv[10] = s[0] * s[5] * s[15] - s[0] * s[7] * s[13] - s[4] * s[1] * s[15]
        + s[4] * s[3] * s[13] + s[12] * s[1] * s[7] - s[12] * s[3] * s[5];
      inv[14] = -s[0] * s[5] * s[14] + s[0] * s[6] * s[13] + s[4] * s[1] * s[14]
        - s[4] * s[2] * s[13] - s[12] * s[1] * s[6] + s[12] * s[2] * s[5];

      inv[3] = -s[1] * s[6] * s[11] + s[1] * s[7] * s[10] + s[5] * s[2] * s[11]
        - s[5] * s[3] * s[10] - s[9] * s[2] * s[7] + s[9] * s[3] * s[6];
      inv[7] = s[0] * s[6] * s[11] - s[0] * s[7] * s[10] - s[4] * s[2] * s[11]
        + s[4] * s[3] * s[10] + s[8] * s[2] * s[7] - s[8] * s[3] * s[6];
      inv[11] = -s[0] * s[5] * s[11] + s[0] * s[7] * s[9] + s[4] * s[1] * s[11]
        - s[4] * s[3] * s[9] - s[8] * s[1] * s[7] + s[8] * s[3] * s[5];
      inv[15] = s[0] * s[5] * s[10] - s[0] * s[6] * s[9] - s[4] * s[1] * s[10]
        + s[4] * s[2] * s[9] + s[8] * s[1] * s[6] - s[8] * s[2] * s[5];

      det = s[0] * inv[0] + s[1] * inv[4] + s[2] * inv[8] + s[3] * inv[12];
      if (det === 0)
        return null;
      det = 1 / det;
      for (i = 0; i < 16; i++)
        e[i] = inv[i] * det;
      return tx;
    },
    setLookTo: function (eyeX, eyeY, eyeZ, toX, toY, toZ, upX, upY, upZ) {
      return this.setLookAt(eyeX, eyeY, eyeZ, eyeX + toX, eyeY + toY, eyeZ + toZ, upX, upY, upZ);
    },
    setLookAt: function (eyex, eyey, eyez, centerx, centery, centerz, upx, upy, upz) {
      var x0, x1, x2, y0, y1, y2, z0, z1, z2, len, mat = new this(), e = mat.elements;
      if (arguments.length < 7) {
        upx = upz = 0;
        upy = 1;
      }
      if (arguments.length < 4) {
        centerx = centery = 0;
        centerz = 1;
      }
      z0 = centerx - eyex;
      z1 = centery - eyey;
      z2 = centerz - eyez;
      len = 1 / Math.sqrt(z0 * z0 + z1 * z1 + z2 * z2);
      z0 *= len;
      z1 *= len;
      z2 *= len;
      x0 = upy * z2 - upz * z1;
      x1 = upz * z0 - upx * z2;
      x2 = upx * z1 - upy * z0;
      len = Math.sqrt(x0 * x0 + x1 * x1 + x2 * x2);
      if (!len) x0 = x1 = x2 = 0;
      else {
        len = 1 / len;
        x0 *= len;
        x1 *= len;
        x2 *= len;
      }
      y0 = z1 * x2 - z2 * x1;
      y1 = z2 * x0 - z0 * x2;
      y2 = z0 * x1 - z1 * x0;
      len = Math.sqrt(y0 * y0 + y1 * y1 + y2 * y2);
      if (!len)
        y0 = y1 = y2 = 0;
      else {
        len = 1 / len;
        y0 *= len;
        y1 *= len;
        y2 *= len;
      }
      e[0] = x0;
      e[4] = y0;
      e[8] = z0;
      e[12] = 0;
      e[1] = x1;
      e[5] = y1;
      e[9] = z1;
      e[13] = 0;
      e[2] = x2;
      e[6] = y2;
      e[10] = z2;
      e[14] = 0;
      e[3] = -(x0 * eyex + x1 * eyey + x2 * eyez);
      e[7] = -(y0 * eyex + y1 * eyey + y2 * eyez);
      e[11] = -(z0 * eyex + z1 * eyey + z2 * eyez);
      e[15] = 1;
      return mat;
    },
    setPerspective: function (fovy, aspect, near, far) {
      var f = 1.0 / Math.tan(fovy), nf = 1 / (far - near), mat = new this(), e = mat.elements;
      e[0] = f / aspect;
      e[4] = 0;
      e[8] = 0;
      e[12] = 0;
      e[1] = 0;
      e[5] = f;
      e[9] = 0;
      e[13] = 0;
      e[2] = 0;
      e[6] = 0;
      e[10] = (far + near) * nf;
      e[14] = 1;
      e[3] = 0;
      e[7] = 0;
      e[11] = -2 * near * far * nf;
      e[15] = 0;
      return mat;
    },
    print: function (fix) {
      var e = this.elements;
      fix = fix || 3;
      for (var i = 0, str = ''; i < 4; i++)
        str += '{0}\t{1}\t{2}\t{3}\r\n'.format(e[i].toFixed(fix), e[i + 4].toFixed(fix), e[i + 8].toFixed(fix), e[i + 12].toFixed(fix));
      console.log(str);
      return str;
    }
  },
  Matrix3: {},
  Vector3: {
    setCross: function (v1, v2) {
      var ax = v1.x, ay = v1.y, az = v1.z,
        bx = v2.x, by = v2.y, bz = v2.z;
      return new bgl.math.Vector3(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
    }
  }
};
(function () {
  var m = bgl.math, s = bgl.math.static, pro;
  m.allOwnPros(function (constructor, name) {
    pro = s[name];
    if (pro)
      pro.allOwnPros(function (method, mname) {
        constructor[mname] = method;
      })
  });
})();
bgl.math.Matrix4.prototype = {
  constructor: bgl.math.Matrix4,
  equals: function (mat) {
    if (!mat)return false;
    var e = mat.elements, m = this.elements, len = e.length;
    if (e instanceof Float32Array && m instanceof Float32Array && m.length == len) {
      for (var i = 0; i < len; i++)
        if (m[i] !== e[i])return false;
      return true;
    }
    return false;
  },
  save: function () {
    var ss = (this._states || []);
    ss.push(new Float32Array(this.elements));
    this._states = ss;
    return this;
  },
  forget: function () {
    delete  this._states;
  },
  restore: function (repeat) {
    var states = this._states, c, e;
    if (states) {
      c = states.length;
      if (!c)return this;
      else if (repeat >= c) repeat = c - 1;
      states.length = c - (repeat || 0);
      e = states.pop();
      if (e)this.elements = e;
      else this.elements = new Float32Array(this.elements.length);
    }
    return this;
  },
  paste: function (des) {
    if (des) {
      var i, e = this.elements, m = des.elements.length == 16 ? des.elements : new Float32Array(16);
      for (i = 0; i < 16; i++)
        m[i] = e[i];
      des.elements = m;
      return des;
    }
    else
      return new this.constructor(this);
  },
  copy: function (src) {
    this.elements = new this.constructor(src).elements;
    return this;
  },
  concat: function (mat4) {
    var i, e, a, b, ai0, ai1, ai2, ai3;
    e = this.elements;
    a = this.elements;
    b = mat4.elements;
    if (e === b) {
      b = new Float32Array(16);
      for (i = 0; i < 16; ++i)
        b[i] = e[i];
    }
    for (i = 0; i < 4; i++) {
      ai0 = a[i];
      ai1 = a[i + 4];
      ai2 = a[i + 8];
      ai3 = a[i + 12];
      e[i] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3];
      e[i + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7];
      e[i + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11];
      e[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
    }
    return this;
  },
  scale: function (x, y, z) {
    var e = this.elements;
    x = x || 1;
    y = y || 1;
    z = z || 1;
    e[0] *= x;
    e[4] *= y;
    e[8] *= z;
    e[1] *= x;
    e[5] *= y;
    e[9] *= z;
    e[2] *= x;
    e[6] *= y;
    e[10] *= z;
    e[3] *= x;
    e[7] *= y;
    e[11] *= z;
    return this;
  },
  translate: function (x, y, z) {
    var e = this.elements;
    e[11] += z || 0;
    e[7] += y || 0;
    e[3] += x || 0;
    return this;
  },
  rotate: function (angel, x, y, z) {
    return this.concat(bgl.math.Matrix4.setRotate(angel, x, y, z));
  },
  inverse: function () {
    this.elements = bgl.math.Matrix4.setInverseOf(this).elements;
    return this;
  },
  transpose: function () {
    var e = this.elements, t;
    t = e[ 1];
    e[ 1] = e[ 4];
    e[ 4] = t;
    t = e[ 2];
    e[ 2] = e[ 8];
    e[ 8] = t;
    t = e[ 3];
    e[ 3] = e[12];
    e[12] = t;
    t = e[ 6];
    e[ 6] = e[ 9];
    e[ 9] = t;
    t = e[ 7];
    e[ 7] = e[13];
    e[13] = t;
    t = e[11];
    e[11] = e[14];
    e[14] = t;
    return this;
  },
  lookTo: function (eyeX, eyeY, eyeZ, toX, toY, toZ) {
    return this.concat(bgl.math.setLookTo(eyeX, eyeY, eyeZ, toX, toY, toZ));
  },
  perspective: function (fovy, aspect, near, far) {
    return this.concat(bgl.math.Matrix4.setPerspective(fovy, aspect, near, far));
  }
};
bgl.math.Matrix3.prototype = {
  constructor: bgl.math.Matrix3,
  save: bgl.math.Matrix4.prototype.save,
  restore: bgl.math.Matrix4.prototype.restore,
  paste: function (des) {
    if (des) {
      var i, e = this.elements, m = des.elements.length == 9 ? des.elements : new Float32Array(9);
      for (i = 0; i < 9; i++)
        m[i] = e[i];
      des.elements = m;
      return m;
    }
    return new this.constructor(this);
  },
  forget: function () {
    delete  this._states;
  },
  copy: bgl.math.Matrix4.prototype.copy
};
bgl.math.Vector3.prototype = {
  constructor: bgl.math.Vector3,
  set x(v) {
    this.elements[0] = v;
  },
  set y(v) {
    this.elements[1] = v;
  },
  set z(v) {
    this.elements[2] = v;
  },
  get x() {
    return this.elements[0];
  },
  get y() {
    return this.elements[1];
  },
  get z() {
    return this.elements[2];
  },
  concat: function (vec3$Mat4$Mat3) {
    var v = this.elements, m = vec3$Mat4$Mat3.elements, r, i, j, w;
    switch (vec3$Mat4$Mat3.elements.length) {
      case 3:
        for (i = 0; i < 3; i++)
          v[i] = v[i] * m[i];
        break;
      case 9:
        r = new Float32Array(3);
        for (i = 0, j = 0; i < 3; i++, j += 3)
          r[i] = v[0] * m[j] + v[1] * m[j + 1] + v[2] * m[j + 2];
        this.elements = r;
        break;
      case 16:
        r = new Float32Array(3);
        w = v[0] * m[12] + v[1] * m[13] + v[2] * m[14] + m[15];
        for (i = 0, j = 0; i < 3; i++, j += 4)
          r[i] = (v[0] * m[j] + v[1] * m[j + 1] + v[2] * m[j + 2] + m[j + 3]) / w;
        this.elements = r;
        break;
    }
    return this;
  },
  translate: function (x, y, z) {
    this.elements[0] += x || 0;
    this.elements[2] += z || 0;
    this.elements[1] += y || 0;
    return this;
  },
  normalize: function () {
    var v = this.elements;
    var c = v[0], d = v[1], e = v[2], g = Math.sqrt(c * c + d * d + e * e);
    if (g && g == 1)
      return this;
    else if (g == 0) {
      v[0] = v[1] = v[2] = 0;
    } else {
      g = 1 / g;
      v[0] = c * g;
      v[1] = d * g;
      v[2] = e * g;
    }
    return this;
  },
  dot: function (vec3) {
    var e = this.elements, d = vec3.elements;
    return e[0] * d[0] + e[1] * d[1] + e[2] * d[2];
  },
  cross: function (v3) {
    var ax = this.x, ay = this.y, az = this.z,
      bx = v3.x, by = v3.y, bz = v3.z, e = this.elements;
    e[0] = ay * bz - az * by;
    e[1] = az * bx - ax * bz;
    e[2] = ax * by - ay * bx;
    return this;
  },
  len: function () {
    return this.dot(this);
  },
  paste: function (des) {
    var e = this.elements;
    if (des) {
      var m = des.elements.length == 3 ? des.elements : new Float32Array(3);
      for (var i = 0; i < 3; i++)
        m[i] = e[i]
      des.elements = m;
      return des;
    }
    else
      return new this.constructor(e[0], e[1], e[2]);
  },
  minus: function (vec3orX, y, z) {
    var e = this.elements, x;
    if (typeof vec3orX != "number") {
      x = vec3orX.x || 0;
      y = vec3orX.y || 0;
      z = vec3orX.z || 0;
    }
    else x = vec3orX;
    e[0] -= x;
    e[1] -= y;
    e[2] -= z;
    return this;
  },
  plus: function (vec3orX, y, z) {
    var e = this.elements;
    if (typeof vec3orX != "number") {
      vec3orX = vec3orX.x || 0;
      y = vec3orX.y || 0;
      z = vec3orX.z || 0;
    }
    e[0] += vec3orX;
    e[1] += y;
    e[2] += z;
    return this;
  },
  rotate: function (angel, x, y, z) {
    var len = 1 / Math.sqrt(x * x + y * y + z * z), s, c, t, rad = angel / 180 * Math.PI,
      b00, b01, b02, b10, b11, b12, b20, b21, b22, e = this.elements, vx = e[0], vy = e[1], vz = e[2];
    s = Math.sin(rad);
    c = Math.cos(rad);
    t = 1 - c;
    if (len !== 1) {
      x *= len;
      y *= len;
      z *= len;
    }
    if (x === y && y === 0) {
      e[0] = vx * c - vy * s;
      e[1] = vx * s + vy * c;
      e[2] = vz;
    }
    else if (x === z && z == 0) {
      e[0] = vz * s + vx * c;
      e[1] = vy;
      e[2] = vz * c - vx * s;
    }
    else if (y === z && y == 0) {
      e[0] = vx;
      e[1] = vy * c - vz * s;
      e[2] = vy * s + vz * c;
    }
    else {
      b00 = x * x * t + c;
      b01 = y * x * t + z * s;
      b02 = z * x * t - y * s;
      b10 = x * y * t - z * s;
      b11 = y * y * t + c;
      b12 = z * y * t + x * s;
      b20 = x * z * t + y * s;
      b21 = y * z * t - x * s;
      b22 = z * z * t + c;
      e[0] = b00 * vx + b01 * vy + b02 * vz;
      e[1] = b10 * vx + b11 * vy + b12 * vz;
      e[2] = b20 * vx + b21 * vy + b22 * vz;
    }
    return this;
  },
  copy: bgl.math.Matrix4.prototype.copy,
  save: bgl.math.Matrix4.prototype.save,
  forget: function () {
    delete  this._states;
  },
  restore: bgl.math.Matrix4.prototype.restore,
  equals: bgl.math.Matrix4.prototype.equals
};
bgl.math.Vector4.prototype = {
  constructor: bgl.math.Vector4,
  get x() {
    return this.elements[0];
  },
  get y() {
    return this.elements[1];
  },
  get z() {
    return this.elements[2];
  },
  get w() {
    return this.elements[3];
  },
  paste: function (des) {
    var e = this.elements;
    if (des) {
      var m = des.elements.length == 4 ? des.elements : new Float32Array(4);
      for (var i = 0; i < 4; i++)
        m[i] = e[i]
      des.elements = m;
      return des;
    }
    else
      return new this.constructor(e[0], e[1], e[2], e[3]);
  },
  forget: function () {
    delete  this._states;
  },
  restore: bgl.math.Matrix4.prototype.restore,
  save: bgl.math.Matrix4.prototype.save,
  copy: bgl.math.Matrix4.prototype.copy
};

bgl.animation = {
  SimpleClock: function (duration, range, direction, offset, timingFunction, infinite) {
    this.duration = duration || 0;
    this.direction = direction || 1;
    this.timingFunction = timingFunction || bgl.animation.TimingFunctions.linear;
    this.multiplier = range || 1;
    this.offset = offset || 0;
    this._startTime = -1;
    this.d = this.direction;
    this.t = this.d == 1 ? 0 : 1;
    this._stopped = true;
    this.value = this.offset;
    this.infinite = infinite || false;
    this._timeline = null;
  },
  TimeLine: function (scene) {
    this._now = this._stopTime = 0;
    this._startTime = this._lastStop = Date.now();
    this._scene = scene;
    this._isStop = true;
  }
};
bgl.animation.SimpleClock.prototype = {
  get refer() {
    return this._refer;
  },
  get scene() {
    var p = this.refer;
    if (p)return p.scene;
    return null;
  },
  waitUpdate: function () {
    var scene = this.scene;
    if (scene) scene.add(this);
    else
      this._waitUpdate = true;
  },
  start: function () {
    if (this.t != (this.direction == 1 ? 0 : 1)) return false;
    this._startTime = -1;
    this.d = this.direction;
    this.t = this.d == 1 ? 0 : 1;
    this._stopped = false;
    this.value=this.t*this.multiplier+this.offset;
    this.waitUpdate();
    return true;
  },
  restart: function () {
    this.t = (this.direction == 1 ? 0 : 1);
    this.start();
  },
  reset: function (timeline) {
    if (timeline instanceof bgl.animation.TimeLine)
      this._timeline = timeline;
    this._startTime = -1;
    this.d = this.direction;
    this.t = (this.d == 1 ? 0 : 1);
    this.value = this.t * this.multiplier + this.offset;
    this._stopped = true;
  },
  end: function (timeline) {
    if (timeline instanceof bgl.animation.TimeLine)
      this._timeline = timeline;
    this._startTime = -1;
    this.d = this.direction;
    this.t = (this.d == 1 ? 1 : 0);
    this.value = this.t * this.multiplier + this.offset;
    this._stopped = true;
  },
  set ontick(f) {
    this.on('update', f);
  },
  reverse: function () {
    if (this.t != ((this.direction == 1 ? 1 : 0))) return false;
    this._startTime = -1;
    this._stopped = false;
    this.d = -this.direction;
    this.t = (this.d == 1 ? 0 : 1);
    this.value=this.t*this.multiplier+this.offset;
    this.waitUpdate();
    return true;
  },
  toggle: function () {
    if (this.t == 0)
      this.restart();
    else if (this.t == 1)
      this.reverse();
  },
  update: function (timeline) {
    if (!this._stopped) {
      if (this._startTime == -1) {
        this._startTime = timeline.now;
        return true;
      }
      var dur = (timeline.now - this._startTime) / timeline.ticksPerSecond;
      if (dur > 0) {
        var ov = this.value;
        this.t = this.d == 1 ? dur / this.duration : 1 - dur / this.duration;
        if (this.t > 1)this.t = 1; else if (this.t < 0)this.t = 0;
        this.value = this.timingFunction.apply(bgl.animation.TimingFunctions, [this.t]) * this.multiplier + this.offset;
        switch (this.t) {
          case 0:
            this._stopped = true;
            this.emit('reverse', [ov, timeline]);
            if (this.infinite) this.restart();
            break;
          case 1:
            this._stopped = true;
            this.emit('end', [ov, timeline]);
            if (this.infinite) this.reverse();
            break;
          default :
            if (ov != this.value)
              this.emit('update', [ov, timeline]);
            break;
        }
        return true;
      }
      delete  this._waitUpdate;
    }
    else timeline.scene.remove(this);
    return false;
  }
};
bgl.animation.TimeLine.prototype = {
  get now() {
    return this._now;
  },
  get isStopped() {
    return this._isStop;
  },
  get scene() {
    return this._scene;
  },
  ticksPerSecond: 1000,
  stop: function () {
    if (!this._isStop) {
      this._isStop = true;
      this._lastStop = Date.now();
    }
  },
  start: function () {
    if (this._isStop) {
      this._isStop = false;
      this._stopTime += Date.now() - this._lastStop;
    }
  },
  tick: function () {
    if (!this._isStop) {
      this._now = Date.now() - this._startTime - this._stopTime;
    }
  }
};
bgl.animation.TimingFunctions = {
  linear: function (t) {
    return t;
  },
  sineEaseIn: function (t) {
    return -Math.cos(t * (Math.PI / 2)) + 1;
  },
  sineEaseOut: function (t) {
    return Math.sin(t * (Math.PI / 2));
  },
  sineEaseInOut: function (t) {
    return -.5 * (Math.cos(Math.PI * t) - 1);
  },
  quintEaseIn: function (t) {
    return t * t * t * t * t;
  },
  quintEaseOut: function (t) {
    t--;
    return t * t * t * t * t + 1;
  },
  quintEaseInOut: function (t) {
    t /= .5;
    if (t < 1) {
      return .5 * t * t * t * t * t;
    }
    t -= 2;
    return .5 * (t * t * t * t * t + 2);
  },
  quartEaseIn: function (t) {
    return t * t * t * t;
  },
  quartEaseOut: function (t) {
    t--;
    return -(t * t * t * t - 1);
  },
  quartEaseInOut: function (t) {
    t /= .5;
    if (t < 1) {
      return .5 * t * t * t * t;
    }
    t -= 2;
    return -.5 * (t * t * t * t - 2);
  },
  circEaseIn: function (t) {
    return -(Math.sqrt(1 - t * t) - 1);
  },
  circEaseOut: function (t) {
    t--;
    return Math.sqrt(1 - t * t);
  },
  circEaseInOut: function (t) {
    t /= .5;
    if (t < 1) {
      return -.5 * (Math.sqrt(1 - t * t) - 1);
    }
    t -= 2;
    return .5 * (Math.sqrt(1 - t * t) + 1);
  },
  quadEaseIn: function (t) {
    return t * t;
  },
  quadEaseOut: function (t) {
    return -1 * t * (t - 2);
  },
  quadEaseInOut: function (t) {
    t /= .5;
    if (t < 1) {
      return .5 * t * t;
    }
    t--;
    return -.5 * (t * (t - 2) - 1);
  },
  cubicEaseIn: function (t) {
    return t * t * t;
  },
  cubicEaseOut: function (t) {
    t--;
    return t * t * t + 1;
  },
  cubicEaseInOut: function (t) {
    t /= .5;
    if (t < 1) {
      return .5 * t * t * t;
    }
    t -= 2;
    return .5 * (t * t * t + 2);
  },
  bounceEaseOut: function (t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else {
      if (t < 2 / 2.75) {
        t -= 1.5 / 2.75;
        return 7.5625 * t * t + .75;
      } else {
        if (t < 2.5 / 2.75) {
          t -= 2.25 / 2.75;
          return 7.5625 * t * t + .9375;
        } else {
          t -= 2.625 / 2.75;
          return 7.5625 * t * t + .984375;
        }
      }
    }
  },
  bounceEaseIn: function (t) {
    return 1 - this.bounceEaseOut(1 - t);
  },
  bounceEaseInOut: function (t) {
    if (t < .5) {
      return this.bounceEaseIn(t * 2) * .5;
    } else {
      return this.bounceEaseOut(t * 2 - 1) * .5 + .5;
    }
  },
  expoEaseIn: function (t) {
    return t == 0 ? 0 : Math.pow(2, 10 * (t - 1));
  },
  expoEaseOut: function (t) {
    return t == 1 ? 1 : -Math.pow(2, -10 * t) + 1;
  },
  expoEaseInOut: function (t) {
    if (t == 0)  return 0;
    else if (t == 1) return 1;
    else if (t / .5 < 1) return .5 * Math.pow(2, 10 * (t / .5 - 1));
    else  return .5 * (-Math.pow(2, -10 * (t / .5 - 1)) + 2);
  },
  zeroStep: function (t) {
    return t <= 0 ? 0 : 1;
  },
  halfStep: function (t) {
    return t < .5 ? 0 : 1;
  },
  oneStep: function (t) {
    return t >= 1 ? 1 : 0;
  },
  random: function (t) {
    return Math.random();
  },
  randomLimit: function (t) {
    return Math.random() * t;
  }
};
(function () {
  var actionType = {
    DOWN: 1, MOVE: 0, UP: 2
  }, eventType = {
    NULL: 0,
    PRESS: 1, CLICK: 2, DRAG: 3, RELEASE: 4, MOVE: 5//point
  };

  function EventPool(element) {
    this.registerHandlers(element);
    this.minMoveDistance = 8;
    this.skipFrameNum = 2;
    this.shouldClear = true;
    this.preventAll = false;
    this._skipped = 0;
    this.pEvents = {};
    this.kEvents = [];
    this.keyDefinition = {
      codes: [], index: [], names: []
    };
    this._lastPoints = {};
    this._lastKey = null;
  }

  function eventTypeName(type) {
    switch (type) {
      case 0:
        return 'unknown';
      case 1:
        return 'press';
      case 2:
        return 'click';
      case 3:
        return 'drag';
      case 4:
        return 'release';
      case 5:
        return 'move';
      default:
        return undefined;
    }
  }

  function equalEventType(type, name) {
    return name.toLowerCase() == eventTypeName(type);
  }

  EventPool.prototype = {
    get shouldSkipFrame() {
      return this._skipped < this.skipFrameNum;
    },
    get lastPointEvents() {
      var r = [], e, ps = this.pEvents, len;
      ps.allOwnPros(function (array, name) {
        len = array.length;
        if (len == 0) delete ps[name];
        else e = array[len - 1];
        if (e == undefined) return;
        e.identifier = name;
        r.push(e);
      });
      return r;
    },
    get lastKeyEvents() {
      return this.kEvents.slice(-1);
    },
    ignoreEvent: function (current, preview) {
      if (preview instanceof PointEvent)
        return this.minMoveDistance > Math.abs(preview.clientX - current.clientX) + Math.abs(preview.clientY - current.clientY);
      return false;
    },
    registerHandlers: function (element) {
      if (!(element instanceof HTMLElement) || element.eventPool)return;
      var pool = this, preventFun = function (e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      handlers.allOwnPros(function (f, name) {
        if (typeof f == "function") {
          element.addEventListener(name, f.bind(pool), true);
          element.addEventListener(name, preventFun, true);
        }
        else
          document.addEventListener(name, f.fun.bind(pool));
      });
      element.eventPool = pool;
      pool.element = element;
    },
    clear: function () {
      var pes = this.pEvents, keys = Object.getOwnPropertyNames(pes), lps = this._lastPoints;
      keys.remove('mouse');
      keys.forEach(function (name) {
        if (!lps[name] || lps[name].action == actionType.UP) delete lps[name];
      });
      this.pEvents = {};
      this.kEvents = [];
    },
    update: function (cfg) {
      if (this.preventAll)return this.clear();
      var evts = this.lastKeyEvents.concat(this.lastPointEvents);
      if (!this.shouldSkipFrame) {
        this.shouldClear = true;
        this.emit('update', [evts, cfg]);
        if (this.shouldClear)this.clear();
        this._skipped = 0;
      }
      else
        this._skipped += 1;
    },
    add: function (event) {
      var evtArray, preview;
      if (event instanceof PointEvent) {
        evtArray = this.pEvents[event.identifier];
        if (!evtArray) this.pEvents[event.identifier] = evtArray = [];
        preview = this._lastPoints[event.identifier];
        if (!event.combine(preview)) {
          evtArray.push(event);
          this._lastPoints[event.identifier] = event;
        }
      }
      else if (event instanceof KeyEvent)
        if (!event.combine(this._lastKey)) {
          this.kEvents.push(event);
          this._lastKey = event;
          event.defination = this.getKeyDefinition(event.keyCode);
        }
      return this;
    },
    addKeyDefinition: function (name, code) {
      var d = this.keyDefinition, codes = d.codes, names = d.names, nameIndex;
      if (arguments.length > 2)
        for (var i = 1, f = this.addKeyDefinition.bind(this, name), arg = arguments[i]; arg; arg = arguments[++i])
          f(arg);
      else {
        if (codes.indexOf(code) > -1)return this;
        nameIndex = names.indexOf(name);
        if (nameIndex == -1) {
          names.push(name);
          nameIndex = names.length - 1;
        }
        codes.push(code);
        d.index.push(nameIndex);
      }
      return this;
    },
    getKeyDefinition: function (keyCode) {
      var d = this.keyDefinition, nameIndex = d.index[d.codes.indexOf(keyCode)];
      return nameIndex == undefined ? undefined : d.names[nameIndex];
    },
    getKeyCodes: function (name) {
      var d = this.keyDefinition, nameIndex = d.names.indexOf(name);
      if (nameIndex < 0)return undefined;
      for (var i = 0, indecies = d.index, len = indecies.length, r = [], codes = d.codes; i < len; i++)
        if (indecies[i] == nameIndex)r.push(codes[i]);
      return r;
    },
    hasCodeDefinition: function (code) {
      return this.keyDefinition.codes.indexOf(code) != -1;
    },
    set onupdate(f) {
      if (typeof f == "function")
        this.on('update', f);
    }
  };
  function KeyEvent(e, action) {
    this.action = action;
    this.keyCode = e.keyCode || e.which;
    this.defination = undefined;
    this.repeat = 1;
    this.event = action == actionType.DOWN ? eventType.PRESS : eventType.RELEASE;
    this.startTime = this.timeStamp = Date.now();
  }

  function PointEvent(e, action) {
    if (e.identifier == undefined)
      e.identifier = 'mouse';
    else {
      var target = e.target;
      e.offsetX = e.clientX - target.clientLeft - target.offsetLeft;
      e.offsetY = e.clientY - target.clientTop - target.offsetTop;
    }
    this.identifier = e.identifier;
    this.action = action;
    this.clientX = e.clientX;
    this.clientY = e.clientY;
    this.offsetX = e.offsetX;
    this.offsetY = e.offsetY;
    this.dx = this.dy = 0;
    this.accumulatedX = this.accumulatedY = 0;
    this.event = eventType.NULL;
    this.startTime = this.timeStamp = Date.now();
  }

  PointEvent.prototype = {
    combine: function (preview) {
      if (!preview)
        switch (this.action) {
          case actionType.DOWN:
            this.event = eventType.PRESS;
            return false;
          case actionType.MOVE:
            this.event = eventType.MOVE;
            return false;
          case actionType.UP:
            this.event = eventType.CLICK;
            return true;
          default :
            throw '';
        }
      var pEvt = preview.event;
      this.dx = this.clientX - preview.clientX;
      this.dy = this.clientY - preview.clientY;
      switch (this.action) {
        case actionType.DOWN:
          this.event = eventType.PRESS;
          switch (pEvt) {
            case eventType.DRAG:
              preview.event = eventType.RELEASE;
              return false;
            case eventType.PRESS:
              preview.event = eventType.NULL;
              return false;
            default :
              return false;
          }
        case actionType.MOVE:
          this.startTime = preview.startTime;
          this.accumulatedX = preview.accumulatedX + this.dx;
          this.accumulatedY = preview.accumulatedY + this.dy;
          switch (pEvt) {
            case eventType.DRAG:
              this.event = eventType.DRAG;
              return false;
            case eventType.PRESS:
              this.event = eventType.DRAG;
              return false;
            default:
              if (pEvt !== eventType.MOVE)this.startTime = this.timeStamp;
              this.event = eventType.MOVE;
              return false;
          }
        case actionType.UP:
          this.startTime = preview.startTime;
          switch (pEvt) {
            case eventType.PRESS:
              this.event = eventType.CLICK;
              return false;
            case eventType.DRAG:
              this.accumulatedX = preview.accumulatedX + this.dx;
              this.accumulatedY = preview.accumulatedY + this.dy;
              this.event = eventType.RELEASE;
              return false;
            default:
              this.event = eventType.NULL;
              return true;
          }
      }
      throw '';
    },
    equalType: function (name) {
      return equalEventType(this.event, name);
    },
    get eventType() {
      return eventTypeName(this.event);
    },
    get defination() {
      return eventTypeName(this.event);
    },
    type: 'point'
  };

  KeyEvent.prototype = {
    combine: function (preview) {
      if (!preview)return false;
      if (preview.event == eventType.PRESS)
        if (this.action == actionType.DOWN) {
          this.event = eventType.PRESS;
          this.repeat += preview.repeat;
          preview.event = eventType.NULL;
          return false;
        }
        else if (preview.repeat == 1) {
          this.event = eventType.CLICK;
          return true;
        }
      return false;
    },
    equalType: function (name) {
      return equalEventType(this.event, name);
    },
    get eventType() {
      return eventTypeName(this.event);
    },
    type: 'key',
    identifier: 'key'
  };
  var handlers = {
    click: function (e) {
    },
    mousedown: function (e) {
      if(e.button!==2){
        this.add(new PointEvent(e, actionType.DOWN));
      }
    },
    mouseup: function (e) {
      this.add(new PointEvent(e, actionType.UP));
    },
    mousemove: function (e) {
      var cur = new PointEvent(e, actionType.MOVE),
        array = this.pEvents[cur.identifier], pre;
      if (array && array.length > 0){
        pre = array[array.length - 1];
      }
      if (!this.ignoreEvent(cur, pre))
        this.add(cur);
      console.log(cur.event);
    },
    keydown: {
      fun: function (e) {
        if (this.hasCodeDefinition(e.keyCode))
          this.add(new KeyEvent(e, actionType.DOWN));
      }
    },
    keyup: {
      fun: function (e) {
        if (this.hasCodeDefinition(e.keyCode))
          this.add(new KeyEvent(e, actionType.UP));
      }
    },
    touchstart: function (e) {
      for (var i = 0, touches = e.changedTouches, touch = touches[0]; touch; touch = touches[++i])
        handlers.mousedown.apply(this, [touch]);
    },
    touchmove: function (e) {
      for (var i = 0, touches = e.changedTouches, touch = touches[0]; touch; touch = touches[++i])
        handlers.mousemove.apply(this, [touch]);
    },
    touchend: function (e) {
      for (var i = 0, touches = e.changedTouches, touch = touches[0]; touch; touch = touches[++i])
        handlers.mouseup.apply(this, [touch]);
    },
    touchcancel: function (e) {
      for (var i = 0, touches = e.changedTouches, touch = touches[0]; touch; touch = touches[++i])
        handlers.mouseup.apply(this, [touch]);
    }

  }, exporer = {};
  exporer.getEventPool = function (element) {
    var p = element.eventPool;
    if (!p)p = new EventPool(element);
    return p;
  };
  if (window.bgl) {
    window.bgl.event = exporer;
  }
  return exporer;
})();
bgl.foundation = {
  Binder: function (name, bindFun, disposeFun) {
    this.name = name;
    if (bindFun)this.bind = bindFun;
    if (disposeFun) this.dispose = disposeFun;
  },
  Attribute: function (name, bufferOrData, stride, offset) {
    this.name = name;
    this._stride = stride || 0;
    this._offset = offset || 0;
    if (!(bufferOrData instanceof bgl.resource.Buffer)) bufferOrData = new bgl.resource.Buffer(bufferOrData);
    this._buffer = bufferOrData;
    this._invalid = true;
  },
  AttributeEntry: function (type, loc, program) {
    var t;
    switch (type) {
      case 'vec2':
        t = 2;
        break;
      case 'vec3':
        t = 3;
        break;
      case 'vec4':
        t = 4;
        break;
      case 'float':
        t = 1;
        break;
    }
    this._size = t;
    this._loc = loc;
    this._program = program;
    this._bindingAttribute = null;
    program.gl.enableVertexAttribArray(loc);
  },
  Uniform: function (name, value, getter, alwaysBind) {
    this.name = name;
    this._val = value;
    getter = getter || value.getter;
    if (getter)
      this.getter = getter;
    this._entry = null;
    if (alwaysBind) this.alwaysBind = true;
  },
  UniformEntry: function (type, location, program) {
    this._type = type;
    this.value = undefined;
    this._loc = location;
    this._program = program;
    this._invalid = true;
    this._bindingUniform = null;
  },
  Sampler2D: function (name, imgOrAddress, onsuccess, onfail, warpRepeat, flipY) {
    this.name = name;
    this.onload = onsuccess;
    this.onerror = onfail;
    if (imgOrAddress instanceof Image)this.img = imgOrAddress;
    else if (typeof  imgOrAddress == "string") {
      this.img = new Image();
      this._img.src = imgOrAddress;
    }
    this._texture = new bgl.resource.Texture(false);
    this._buffered = false;
    this.flipY = flipY ? 1 : 0;
    this.imgParam = {
      TEXTURE_MAG_FILTER: 'LINEAR',
      TEXTURE_MIN_FILTER: 'LINEAR',
      TEXTURE_WRAP_S: warpRepeat ? 'REPEAT' : 'CLAMP_TO_EDGE',
      TEXTURE_WRAP_T: warpRepeat ? 'REPEAT' : 'CLAMP_TO_EDGE'
    };
  },
  SamplerCube: function (name, baseAddress, right, left, up, down, back, front, onsuccess, onfail) {
    this.name = name;
    this.imgs = {};
    this._texture = new bgl.resource.Texture(true);
    this._buffered = false;
    this._ready = false;
    this._loaded = 0;
    this.onsuccess = onsuccess;
    this.onfail = onfail;
    this.imgParam = {
      TEXTURE_MAG_FILTER: 'LINEAR',
      TEXTURE_MIN_FILTER: 'LINEAR',
      TEXTURE_WRAP_S: 'CLAMP_TO_EDGE',
      TEXTURE_WRAP_T: 'CLAMP_TO_EDGE'
    };
    var w = this.wrapImg.bind(this), b = baseAddress || '';
    w(b + left, 'NEGATIVE_X');
    w(b + down, 'NEGATIVE_Y');
    w(b + front, 'NEGATIVE_Z');
    w(b + right, 'POSITIVE_X');
    w(b + up, 'POSITIVE_Y');
    w(b + back, 'POSITIVE_Z');
  }
};
bgl.foundation.SamplerCube.prototype = {
  get texture() {
    return this._texture;
  },
  get buffered() {
    return this._buffered && this._texture._buffered;
  },
  getter: function () {
    return this._texture._index;
  },
  bind: function (gl) {
    if (!this.bufferData(gl))
      this._texture.bind(gl);
    this._entry.bind(gl, this);
  },
  releaseTexture: function () {
    this._buffered = false;
    this._texture.refer = null;
    this._texture = null;
  },
  bufferData: function (gl) {
    if (this._ready && !this.buffered) {
      var imgs = this.imgs, params = this.imgParam, tex = this.texture, cfg = gl.cfg, img;
      tex.bind(gl);
      for (var i in imgs)
        if (imgs.hasOwnProperty(i)) {
          img = imgs[i];
          gl.texImage2D(gl['TEXTURE_CUBE_MAP_' + i], 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
          delete img.onload;
          delete img.onunload;
        }
      for (var p in params)
        if (params.hasOwnProperty(p))
          gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl[p], gl[params[p]]);
      this._buffered = true;
      this._entry = gl.cfg.curProgram.uniforms[this.name];
      delete this.onsuccess;
      delete this.onfail;
      return true;
    }
    return false;
  },
  wrapImg: function (src, position) {
    var img = new Image();
    img.crossOrigin = "";
    img.loader = this;
    img.onload = this.onload.bind(this);
    img.onunload = this.onunload.bind(this);
    img.src = src;
    this.imgs[position] = img;
  },
  onunload: function () {
    console.log('TextureCubic load Fail:' + this._loc);
    if (this.onfail) this.onfail(this);
    delete this.onsuccess;
    delete this.onfail;
  },
  onload: function () {
    if (++this._loaded == 6) {
      this._ready = true;
      if (this.onsuccess)this.onsuccess(this);
    }
  },
  dispose: function () {
    var tex = this.texture;
    if (tex)tex.dispose();
    delete this.imgs;
  }
};
bgl.foundation.Sampler2D.prototype = {
  get buffered() {
    return this._buffered && this._texture._buffered;
  },
  set onload(f) {
    if (typeof f == "function") this.on('load', f)
  },
  set onerror(f) {
    if (typeof f == "function")this.on('error', f)
  },
  set onchanage(f) {
    if (typeof f == 'function') this.on('change', f);
  },
  set img(img) {
    var om = this._img, self = this;
    if (!(img instanceof  Image) || om === img) return;
    this._img = img ? img : null;
    this.emit('change', [om, self]);
    if (img)
      if (img.complete && img.src)
        setTimeout(function () {
          self.emit('load', [img, this]);
        }, 1);
      else {
        img.addEventListener('load', function (e) {
          self.emit('load', [e.target, self])
        });
        img.addEventListener('error', function (e) {
          console.log('img fail', e);
          self.emit('error', [e.target, self])
        });
      }
    this._buffered = false;
  },
  get img() {
    return this._img;
  },
  bufferData: function (gl) {
    if (this.buffered) return false;
    var img = this.img, params = this.imgParam, tex = this._texture;
    tex.bind(gl);
    if (!img) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, null);
    else if (img.complete) {
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      for (var p in params)
        if (params.hasOwnProperty(p))
          gl.texParameteri(gl.TEXTURE_2D, gl[p], gl[params[p]]);
      if (Math.isInt(Math.log2(img.width * img.height)))
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    this._entry = gl.cfg.curProgram.uniforms[this.name];
    this._buffered = true;
    return true;
  },
  getter: function () {
    return this._texture._index;
  },
  bind: function (gl) {
    if (!this.bufferData(gl))
      this._texture.bind(gl);
    this._entry.bind(gl, this);
  },
  releaseTexture: function () {
    this._buffered = false;
    this._texture.refer = null;
    this._texture = null;
  },
  dispose: function () {
    var tex = this.texture;
    if (tex)tex.dispose();
    delete this._img;
  }
};
bgl.foundation.Uniform.prototype = {
  bind: function (gl) {
    if (!this._entry)
      this._entry = gl.cfg.curProgram.uniforms[this.name];
    return this._entry.bind(gl, this);
  },
  get value() {
    if (this._entry) this._entry.invalid();
    return this._val;
  },
  set value(val) {
    this._val = val;
    if (this._entry) this._entry.invalid();
  },
  dispose: function () {
    if (this._val.dispose)this._val.dispose();
  },
  invalid: function () {
    var entry = this._entry;
    if (entry)entry.invalid();
  }
};
bgl.foundation.UniformEntry.prototype = {
  get bindingUniform() {
    var u = this._bindingUniform;
    if (u && !this._invalid)return u;
    return null;
  },
  setters: {
    mat4: function (gl, mat) {
      gl.uniformMatrix4fv(this._loc, false, mat.elements);
    },
    mat3: function (gl, mat) {
      gl.uniformMatrix3fv(this._loc, false, mat.elements);
    },
    vec3: function (gl, vec) {
      gl.uniform3fv(this._loc, vec.elements);
    },
    float: function (gl, f) {
      gl.uniform1f(this._loc, f);
    },
    sampler2D: function (gl, index) {
      gl.uniform1i(this._loc, index);
    },
    samplerCube: function (gl, index) {
      gl.uniform1i(this._loc, index);
    },
    int: function (gl, i) {
      gl.uniform1i(this._loc, i);
    },
    vec4: function (gl, v4) {
      gl.uniform4fv(this._loc, v4.elements);
    }
  },
  invalid: function () {
    this._program.gl.cfg.curScene.invalid();
    this._invalid = true;
  },
  change: function (func) {
    var uniform = this._bindingUniform;
    if (uniform) {
      var ov = uniform._val, v = func(ov);
      this.value = v === undefined ? ov : v;
      this.invalid();
      return true;
    }
    return false;
  },
  bind: function (gl, uniform) {
    if (this.bindingUniform === uniform) return false;
    var val = uniform.getter ? uniform.getter.apply(uniform, [uniform._val, gl.cfg]) : uniform._val;
    this.setters[this._type].apply(this, [gl, val]);
    this.value = val;
    this._bindingUniform = uniform;
    this._invalid = uniform.alwaysBind;
    return true;
  }
};
bgl.foundation.Attribute.prototype = {
  invalid: function () {
    var e = this._entry;
    if (e)e.invalid();
  },
  get data() {
    return this._buffer.data
  },
  set data(d) {
    this._buffer.data = d;
    this.invalid();
  },
  get buffered() {
    return this._buffer.buffered;
  },
  bind: function (gl) {
    var entry = this._entry;
    if (!entry) {
      entry = gl.cfg.curProgram.attributes[this.name];
      this._entry = entry;
      this._size = entry._size;
      this._loc = entry._loc;
    }
    this._buffer.bind(gl);
    gl.vertexAttribPointer(this._loc, this._size, gl.FLOAT, false, this._stride, this._offset);
  },
  bufferData: function (gl) {
    this._buffer.bufferData(gl);
  },
  dispose: function () {
    if (this._buffer) this._buffer.dispose();
  }
};
bgl.foundation.AttributeEntry.prototype = {
  invalid: function () {
    this._program.gl.cfg.curScene.invalid();
  },
  change: function (func) {
    var attribute = this._bindingAttribute;
    if (attribute) {
      func(attribute);
      this.invalid();
      return true;
    }
    return false;
  }
};
bgl.foundation.Binder.prototype = {
  dispose: function (cfg) {

  },
  bind: function (gl) {
    return false;
  }
};
bgl.model = {
  Geometry: function (indexBufferOrArray, binders, modelMatrix, modelBound, drawMode) {
    this.binders = binders || {};
    this.drawMode = drawMode || WebGLRenderingContext.TRIANGLES;
    if (indexBufferOrArray)
      this.indexBuffer = (indexBufferOrArray instanceof bgl.resource.Buffer) ? indexBufferOrArray :
        new bgl.resource.Buffer(indexBufferOrArray, WebGLRenderingContext.ELEMENT_ARRAY_BUFFER);
    else this.draw = function () {
    };
    this._culler = new bgl.cull.CullLeaf(this, modelMatrix, modelBound);
    this._hittable = false;
    this._parent = null;
    this._controller = null;
    this._settings = {
      alwaysCulled: null
    };
  },
  Camera: function (options, at, to, up) {
    var v = bgl.math.Vector3;
    options = options || 0;
    this._near = options.near || 0.01;
    this._far = options.far || 1.01;
    this._aspect = options.aspect || 1;
    this._fovy = (options.fovy || 60) / 180 * Math.PI;
    (at instanceof v) ? this._at = at : this._at = at = new v(0, 0, 0);
    this._front = to instanceof v ? to.minus(at).normalize() : at.paste().minus(0, 0, -1);
    this._top = up instanceof v ? up.minus(at).normalize() : at.paste().minus(0, -1, 0);
    this._scene = options.scene;
    this.freeze = false;
    this._invalid = true;
  },
  Render: function (binders, modelMatrix) {
    this._scene = null;
    this._parent = null;
    this._children = [];
    this._geometries = [];
    this._controller = null;
    this._culler = new bgl.cull.CullNode(this, modelMatrix);
    this.binders = binders || {};
    this._invalid = true;
    this._depth = 0;
    this._hittable = false;
    this._settings = {
      alwaysCulled: null
    };
  },
  Scene: function (camera) {
    this._camera = camera instanceof bgl.model.Camera ? camera : new bgl.model.Camera({scene: this});
    this._rootRender = new bgl.model.Render();
    this._activeControllers = [];
    this._detectors = [];
    this._colliders = [];
    this._timeline = new bgl.animation.TimeLine(this);
    this._invalid = true;
    this.cfg = null;
    this._settings = {
      asyncCull: true,
      discard: false
    };
    this._rootRender._scene = this;
    this._camera.invalid();
  },
  Collider: function (worldBoundOrGetter, maxTargetNum, reuse, ignoreCull) {
    this.scene = null;
    if (typeof  worldBoundOrGetter == "function")
      this.getter = worldBoundOrGetter;
    else if (worldBoundOrGetter)
      this._wBound = worldBoundOrGetter;
    this.reuse = reuse || false;
    this.ignoreCull = ignoreCull || false;
    this.maxTargets = maxTargetNum || 256;
    this._collidedDetectors = [];
    this._invalid = true;
  },
  Detector: function (worldBound, ignoreCull) {
    this.worldBound = worldBound;
    this.ignoreCull = ignoreCull || false;
    this.culled = null;
    this.scene = null;
  }
};
bgl.model.Collider.prototype = {
  event: {
    collided: 'collided',
    depart: 'depart',
    fullfill: 'complete'
  },
  get worldBound() {
    var getter = this.getter;
    return getter ? getter(this) : this._wBound;
  },
  set onCollided(fun) {
    if (typeof  fun == "function")
      this.on(this.event.collided, fun);
  },
  set onDepart(fun) {
    if (typeof  fun == "function")
      this.on(this.event.depart, fun);
  },
  set onComplete(fun) {
    if (typeof  fun == "function")
      this.on(this.event.fullfill, fun);
  },
  emitCollision: function (evt, detector) {
    detector.emit(evt, [this]);
    this.emit(evt, [detector]);
  },
  collide: function (detectors) {
    if (!(detectors instanceof Array)) return [];
    var cms = this._collidedDetectors, ds = cms.concat(), nds, igc = this.ignoreCull, rds = [], max = this.maxTargets;
    for (var i = 0, d = ds[0]; d; d = ds[++i])
      if (!d.detect(this)) {
        this.emitCollision(this.event.depart, d);
        cms.remove(d);
      }
    nds = detectors.filter(function (d) {
      return ds.indexOf(d) < 0;
    });
    for (i = 0, d = nds[0]; d; d = nds[++i])
      if (max <= rds.length)return rds;
      else if ((igc || d.ignoreCull || d.culled === false) && d.detect(this)) {
        rds.add(d);
        cms.add(d);
        this.emitCollision(this.event.collided, d);
      }
    return rds;
  },
  invalid: function () {
    if (!this._invalid) {
      this._invalid = true;
      // var s=this.scene;
      //if(s)s.invalid();
    }
    return this;
  },
  reset: function () {
    this._invalid = false;
    return this;
  }
};
bgl.model.Detector.prototype = {
  event: bgl.model.Collider.prototype.event,
  set onCollided(fun) {
    if (typeof  fun == "function")
      this.on(this.event.collided, fun);
  },
  set onDepart(fun) {
    if (typeof  fun == "function")
      this.on(this.event.depart, fun);
  },
  get culler() {
    return this;
  },
  detect: function (collider) {
    return this.worldBound.overlap(collider.worldBound);
  },
  cull: function (camera) {
    var r;
    r = this.culled = !camera.contains(this.worldBound);
    return r;
  }
};
bgl.model.Scene.prototype = {
  set discard(b) {
    this._settings.discard = !!b;
  },
  get discard() {
    return this._settings.discard;
  },
  get enable() {
    return this._enable !== false;
  },
  set enable(b) {
    var ob = this._enable;
    if (b == ob)return;
    this._enable = b;
    this.invalid();
  },
  get asyncCull() {
    return this._settings.asyncCull;
  },
  set asyncCull(b) {
    if (this.asyncCull != b)this._settings.asyncCull = b;
    this.invalid();
  },
  get rootRender() {
    return this._rootRender;
  },
  get camera() {
    return this._camera;
  },
  set rootRender(r) {
    var or = this._rootRender;
    if (!(r instanceof bgl.model.Render) || r === or)return;
    if (or) {
      or._scene = null;
    }
    this._rootRender = r;
    r._scene = this;
    this.camera.invalid();
  },
  set camera(c) {
    var oc = this._camera;
    if (!(c instanceof  bgl.model.Camera) || c === oc)return;
    if (oc) {
      oc._scene = null;
    }
    this._camera = c;
    c._scene = this;
    c.invalid();
  },
  invalid: function () {
    this._invalid = true;
    return this;
  },
  update: function (cfg) {
    var timeLine = this._timeline;
    timeLine.tick();
    for (var i = 0, cs = this._activeControllers, c = cs[0]; c; c = cs[++i])
      c.update(timeLine);
    this.emit('update', [cfg]);
  },
  cull: function (forceCull, async, camera) {
    this.rootRender.cull(forceCull, async || this.asyncCull, camera || this.camera);
  },
  render: function (gl, cfg) {
    if (!this.enable)return;
    this.update(cfg);
    var camera = this.camera, asyncCull = this.asyncCull;
    if (!this.discard)
      this.detectCollision(camera);
    if (!this.discard && (this._invalid || camera._invalid)) {
      camera.freeze = true;
      if (asyncCull) {
        this.cull(camera._invalid, true, camera);
        this._camera._invalid = false;
      }
      if (!this.discard)
        this.rootRender.render(gl, cfg, asyncCull);
      camera._invalid = camera.freeze = false;
      this._invalid = false;
      this.discard = false;
    }
  },
  detectCollision: function (camera, colliders) {
    var cs, ds, i, c, d, ncs, evt;
    camera = camera || this.camera;
    cs = colliders || (camera._invalid ? this._colliders : this._colliders.filter(function (c) {
      return c._invalid;
    }));
    if (cs.length == 0) return;
    ds = this._detectors;
    for (i = 0, d = ds[0]; d; d = ds[++i])
      if (camera._invalid || d.culled == null)
        d.culler.cull(camera, false);
    ncs = [];
    evt = cs[0].event.fullfill;
    for (i = 0, c = cs[0]; c; c = cs[++i]) {
      c.emit(evt, [c.collide(ds)], c);
      if (c.reuse) ncs.add(c.reset());
    }
    this._colliders = ncs;
  },
  dispose: function (cfg) {
    this._camera._scene = null;
    this.rootRender.dispose(cfg);
    this._activeControllers.forEach(function (c) {
      c.dispose(cfg)
    });
    delete  this._rootRender;
    delete  this._camera;
  },
  add: function (model_IUpdate_IDetect_Collider) {
    var r = false;
    if (model_IUpdate_IDetect_Collider instanceof bgl.model.Render || model_IUpdate_IDetect_Collider instanceof bgl.model.Geometry)
      r = this.rootRender.add(model_IUpdate_IDetect_Collider);
    else if (model_IUpdate_IDetect_Collider instanceof bgl.model.Collider && this._colliders.add(model_IUpdate_IDetect_Collider)) {
      r = true;
      model_IUpdate_IDetect_Collider.scene = this;
    }
    else if (model_IUpdate_IDetect_Collider instanceof bgl.model.Detector && this._detectors.add(model_IUpdate_IDetect_Collider)) {
      r = true;
      model_IUpdate_IDetect_Collider.scene = null;
    }
    else if (model_IUpdate_IDetect_Collider.update && this._activeControllers.add(model_IUpdate_IDetect_Collider)) {
      model_IUpdate_IDetect_Collider._scene = this;
      r = true;
    }

    if (r)this.invalid();
    return this;
  },
  remove: function (model_IUpdate_IDetect_Collider) {
    var r = false;
    if (model_IUpdate_IDetect_Collider instanceof bgl.model.Render || model_IUpdate_IDetect_Collider instanceof bgl.model.Geometry)
      r = this.rootRender.remove(model_IUpdate_IDetect_Collider);
    else if (model_IUpdate_IDetect_Collider instanceof bgl.model.Collider)
      r = this._colliders.remove(model_IUpdate_IDetect_Collider);
    else if (model_IUpdate_IDetect_Collider instanceof bgl.model.Detector) {
      r = this._detectors.remove(model_IUpdate_IDetect_Collider);
      model_IUpdate_IDetect_Collider.scene = null;
    }
    else if (model_IUpdate_IDetect_Collider.update && this._activeControllers.remove(model_IUpdate_IDetect_Collider)) {
      model_IUpdate_IDetect_Collider._scene = null;
      r = true;
    }
    if (r)this.invalid();
    return this;
  }
};
bgl.model.Render.prototype = {
  detect: function (collider) {
    return this.worldBound.overlap(collider.worldBound);
  },
  dispose: function (cfg) {
    var f = function (o) {
      o.dispose(cfg);
    }, c = this._controller;
    if (c) {
      if (c._scene)c._scene.remove(c);
      c.dispose(cfg);
      c._scene = null;
      c._refer = null;
    }
    this._culler.dispose();
    this.binders.allOwnPros(f);
    this._geometries.forEach(f);
    this._children.forEach(f);
    this._settings = {
      alwaysCulled: null
    };
    this._parent = null;
    this._scene = null;
  },
  invalid: function () {
    var s = this.scene;
    if (s)s.invalid();
    return this;
  },
  bind: function (gl, cfg) {
    var binders = this.binders, names = Object.getOwnPropertyNames(binders);
    for (var i = 0, name = names[0]; name; name = names[++i])
      binders[name].bind(gl, cfg);
  },
  update: function (cfg) {
    cfg.curRender = this;
    cfg.curProgram = this.program;
  },
  render: function (gl, cfg, asyncCull) {
    var i, cs, c;
    if (!this.enable)return;
    this.update(cfg);
    if (!asyncCull && this.culled === null)
      this.cull(false, false, cfg.curCamera);
    if (this.culled === false) {
      this.bind(gl, cfg);
      for (i = 0, cs = this._geometries, c = cs[0]; c; c = cs[++i])
        c.render(gl, cfg);
      for (i = 0, cs = this._children, c = cs[0]; c; c = cs[++i])
        c.render(gl, cfg, asyncCull);
    }
  },
  cull: function (forceCull, asyncCull, camera) {
    if (forceCull || this.culled === null)
      this.culler.cull(camera, asyncCull);
  },
  set hittable(b) {
    var ob = this._hittable, scene;
    b = !!b;
    if (ob == b)return;
    this._hittable = b;
    scene = this.scene;
    if (scene) {
      if (b)
        scene._detectors.add(this);
      else
        scene._detectors.remove(this);
    }
  },
  get hittable() {
    return this._hittable;
  },
  get enable() {
    return this._enable !== false;
  },
  set enable(b) {
    var ob = this._enable;
    if (b == ob)return;
    this._enable = b;
    this.invalid();
  },
  get program() {
    return this._program;
  },
  set program(p) {
    this._program = p;
    this.invalid();
  },
  get scene() {
    if (this.parent)
      return this.parent.scene;
    else return this._scene;
  },
  get parent() {
    return this._parent;
  },
  get culler() {
    return this._culler;
  },
  get worldBound() {
    return this._culler.worldBound;
  },
  get worldMatrix() {
    return this._culler.worldMatrix;
  },
  set modelMatrix(mat) {
    this._culler.modelMatrix = mat;
  },
  get modelMatrix() {
    return this._culler.modelMatrix;
  },
  get culled() {
    var c = this._settings.alwaysCulled;
    if (c === null)return this._culler._culled;
    else return c;
  },
  get controller() {
    return this._controller;
  },
  set controller(c) {
    var oc = this.controller;
    if (oc === c)return;
    var scene = this.scene;
    if (oc) {
      if (scene) scene.remove(oc);
      oc._refer = null;
    }
    this._controller = c;
    if (c) {
      if (c._waitUpdate && scene) scene.add(c);
      c._refer = this;
    }
  },
  findBinder: function (name) {
    var b = this.binders[name];
    if (!b) {
      for (var i = 0, geos = this._geometries, geo = geos[0]; geo; geo = geos[++i]) {
        b = geo.findBinder(name);
        if (b)return b;
      }
      for (i = 0, geos = this._children, geo = geos[0]; geo; geo = geos[++i]) {
        b = geo.findBinder(name);
        if (b)return b;
      }
    }
    return b;
  },
  concat: function (mat) {
    this._culler.concat(mat);
    return this.invalid();
  },
  add: function (renderOrGeo) {
    if (arguments.length > 1) {
      for (var i = 0, c = arguments[0]; c; c = arguments[++i])
        this.add(c);
    }
    else if (renderOrGeo.parent) return false;
    else if (
      renderOrGeo instanceof bgl.model.Render && this._children.add(renderOrGeo) ||
      renderOrGeo instanceof bgl.model.Geometry && this._geometries.add(renderOrGeo)) {
      this._culler.add(renderOrGeo._culler);
      renderOrGeo._parent = this;
      renderOrGeo._depth = this._depth + 1;
      var c = renderOrGeo.controller, scene = this.scene;
      if (scene) {
        if (c && c._waitUpdate)
          scene.add(c);
        if (renderOrGeo.hittable)
          scene._detectors.add(renderOrGeo);
      }
      this.invalid();
    }
    else return false;
    return true;
  },
  remove: function (renderOrGeo) {
    var r = (renderOrGeo._geometries ? this._children : this._geometries).remove(renderOrGeo);
    if (r) {
      var scene = this.scene;
      if (scene) {
        scene._activeControllers.remove(this._controller);
        scene._detectors.remove(this);
      }
      renderOrGeo._parent = null;
      this._culler.remove(renderOrGeo._culler);
      this.invalid();
    }
    return r;
  },
  addBinder: function (binder, name) {
    if (typeof binder == "function" && name)
      binder = new bgl.foundation.Binder(name, binder);
    name = name || binder.name;
    if (!name || !binder.bind || !binder.dispose) throw 'cannot add';
    this.binders[name] = binder;
    binder.refer = this;
    return this;
  },
  removeBinder: function (name) {
    var bs = this.binders, b = bs[name];
    bs[name] = undefined;
    return this;
  },
  save: function () {
    this._culler.save();
    return this;
  },
  forget: function () {
    this._culler.forget();
    return this;
  },
  restore: function (repeat) {
    this._culler.restore(repeat);
    return this;
  }
};
bgl.model.Camera.prototype = {
  get at() {
    return this._at;
  },
  get up() {
    var up = this._up;
    if (!up)
      this._up = up = this._top.paste().minus(this._at);
    return up.paste();
  },
  get to() {
    var to = this._to;
    if (!to)
      this._to = to = this._front.paste().minus(this._at);
    return to.paste();
  },
  get right() {
    return this.to.constructor.setCross(this.up, this.to);
  },
  get fovy() {
    return (this._fovy / Math.PI) * 180;
  },
  set fovy(val) {
    var of = this.fovy;
    if (isNaN(val) || val >= 180 || of == val)return;
    this._fovy = val / 180 * Math.PI;
    this.reset();
  },
  invalid: function () {
    if (!this._invalid) {
      this._invalid = true;
      if (this.scene) this.scene.invalid();
    }
    return this;
  },
  save: function () {
    var s = {
      _at: this._at.paste(),
      _front: this._front.paste(),
      _top: this._top.paste()
    }, ss = this._states || [];
    this.allOwnPros(function (value, name) {
      if (typeof value != "object"&&name[0]=='_') s[name] = value;
    });
    ss.push(s);
    this._states = ss;
    return this;
  },
  forget: function () {
    delete  this._states;
    return this;
  },
  restore: function (repeat) {
    var states = this._states, s, c, that;
    if (states) {
      c = states.length;
      if (!c)return this;
      else if (repeat >= c) repeat = c - 1;
      states.length = c - (repeat || 0);
      s = states.pop();
      that = this;
      s.allOwnPros(function (value, name) {
        that[name] = value;
      });
      this._states = states;
    }
    return this;
  },
  reset: function () {
    this._vMatrix = null;
    this._wBound = null;
    this._pMatrix = null;
    this._vpMatirx = null;
    this._up = null;
    this._to = null;
    return this.invalid();
  },
  _constructBound: function () {
    var mat = this.mvpMatrix().inverse(), V = bgl.math.Vector3,
      points = [new V(1, 1, 0), new V(-1, 1, 0), new V(1, -1, 0), new V(-1, -1, 0),
        new V(1, 1, 1), new V(-1, 1, 1), new V(1, -1, 1), new V(-1, -1, 1)];
    points.forEach(function (p) {
      p.concat(mat);
    });
    this._wBound = new bgl.cull.BoundBox(points);
    return this;
  },
  contains: function (worldBound) {
    return this.worldBound.overlap(worldBound);
  },
  mvpMatrix: function (modelMatrix) {
    var vpm = this._vpMatirx;
    if (!vpm) this._vpMatirx = vpm = this.viewMatrix.concat(this.perspectiveMatrix).paste();
    if (!modelMatrix)modelMatrix = new vpm.constructor();
    return modelMatrix.paste().concat(this._vpMatirx);
  },
  concat: function (mat) {
    if (this.freeze)return this;
    this._at.concat(mat);
    this._front.concat(mat);
    this._top.concat(mat);
    return this.reset();
  },
  orient: function (horizon, vertical) {
    var at = this.at, ft = this._front, e = ft.elements, to = this.to;//new at.constructor(e[0]-at.x,e[1]-at.y,e[2]-at.z);
    if (horizon)
      to.rotate(horizon, 0, 1, 0);
    if (vertical)
      to.rotate(vertical, 1, 0, 0);
    to.normalize();
    e[0] = to.x + at.x;
    e[1] = to.y + at.y;
    e[2] = to.z + at.z;
    return this.reset();
  },
  get viewMatrix() {
    var m = this._vMatrix;
    if (!m) {
      var c = this._front, up = this.up, a = this.at;
      this._vMatrix = m = bgl.math.Matrix4.setLookAt(a.x, a.y, a.z, c.x, c.y, c.z, up.x, up.y, up.z);
    }
    return m;
  },
  get perspectiveMatrix() {
    if (!this._pMatrix) {
      var m = bgl.math.Matrix4.setPerspective(this._fovy, this.aspect, this.near, this.far);
      this._pMatrix = m;
      return m;
    }
    return this._pMatrix;
  },
  get worldBound() {
    if (!this._wBound) this._constructBound();
    return this._wBound;
  },
  get scene() {
    return this._scene;
  }
};
bgl.model.Geometry.prototype = {
  dispose: function (cfg) {
    var f = function (o) {
      o.dispose(cfg);
    }, c = this._controller;
    this.binders.allOwnPros(f);
    if (c) {
      if (c._scene)c._scene.remove(c);
      c.dispose(cfg);
      c._scene = null;
      c._refer = null;
    }
    this._culler.dispose();
    this._parent = null;
  },
  detect: function (collider) {
    return this.worldBound.overlap(collider.worldBound);
  },
  set hittable(b) {
    var ob = this._hittable, scene;
    b = !!b;
    if (ob == b)return;
    this._hittable = b;
    scene = this.scene;
    if (scene) {
      if (b)
        scene._detectors.add(this);
      else
        scene._detectors.remove(this);
    }
  },
  get hittable() {
    return this._hittable;
  },
  get controller() {
    return this._controller;
  },
  set controller(c) {
    var oc = this.controller;
    if (oc === c)return;
    var scene = this.scene;
    if (oc) {
      if (scene) scene.remove(oc);
      oc._refer = null;
    }
    this._controller = c;
    if (c) {
      if (c._waitUpdate && scene) scene.add(c);
      c._refer = this;
    }
  },
  get enable() {
    return this._enable !== false;
  },
  set enable(b) {
    var ob = this._enable;
    if (b == ob)return;
    this._enable = b;
    this.invalid();
  },
  get culler() {
    return this._culler;
  },
  get culled() {
    var c = this._settings.alwaysCulled;
    if (c === null)return this._culler._culled;
    else return c;
  },
  get worldBound() {
    return this._culler.worldBound;
  },
  get worldMatrix() {
    return this._culler.worldMatrix;
  },
  get modelMatrix() {
    return this._culler.modelMatrix;
  },
  get modelBound() {
    return this._culler.modelBound;
  },
  set modelBound(b) {
    this._culler.modelBound = b;
    this.invalid();
  },
  get parent() {
    return this._parent;
  },
  set parent(render) {
    var or = this.parent;
    if (!(render instanceof bgl.model.Render) || or === render) return;
    if (or) or.remove(this);
    render.add(this);
  },
  invalid: function () {
    var r = this.parent;
    if (r)r.invalid();
    return this;
  },
  concat: function (mat) {
    this._culler.concat(mat);
    return this.invalid();
  },
  update: function (cfg) {
    cfg.curGeometry = this;
  },
  draw: function (gl, cfg) {
    this.indexBuffer.bind(gl, cfg);
    gl.drawElements(this.drawMode, this.indexBuffer.length, gl.UNSIGNED_SHORT, 0);
  },
  bind: function (gl, cfg) {
    var binders = this.binders, names = Object.getOwnPropertyNames(binders);
    for (var i = 0, name = names[0]; name; name = names[++i])
      binders[name].bind(gl, cfg);
  },
  render: function (gl, cfg) {
    if (!this.enable)return;
    this.update(cfg);
    if (this.culled === null)
      this.culler.cull(cfg.camera);
    if (this.culled === false) {
      this.bind(gl, cfg);
      this.draw(gl, cfg);
    }
  },
  addBinder: bgl.model.Render.prototype.addBinder,
  removeBinder: bgl.model.Render.prototype.removeBinder,
  save: function () {
    this._culler.save();
    return this;
  },
  restore: function (repeat) {
    this._culler.restore(repeat);
    return this;
  },
  forget: function () {
    this._culler.forget();
    return this;
  },
  findBinder: function (name) {
    return this.binders[name];
  }
};
bgl.cull = {
  BoundBox: function (xOrPoints, y, z, halfWidth, halfHeight, halfDepth) {
    if (xOrPoints instanceof Array)
      this._fromPoints(xOrPoints);
    else {
      this._center = new bgl.math.Vector3(xOrPoints || 0, y || 0, z || 0);
      this._hh = halfHeight || 1;
      this._hw = halfWidth || 1;
      this._hd = halfDepth || 1;
      this._resetBounds();
    }
  },
  CullNode: function (refer, modelMatrix) {
    this._nodes = [];
    this._parent = null;
    this._refer = refer;
    this._leaves = [];
    this._culled = null;
    this._mMatrix = modelMatrix || new bgl.math.Matrix4();
  },
  CullLeaf: function (refer, modelMatrix, modelBound) {
    this._parent = null;
    this._culled = null;
    this._refer = refer;
    this._mMatrix = modelMatrix || new bgl.math.Matrix4();
    this._mBound = modelBound || new bgl.cull.BoundBox();
  }
};
bgl.cull.BoundBox.prototype = {
  constructor: bgl.cull.BoundBox,
  get points() {
    if (!this._points) return this._constructPoints();
    return this._points;
  },
  get radius() {
    var w = this._hw, h = this._hh, d = this._hd;
    return Math.sqrt(w * w + h * h + d * d);
  },
  get center() {
    return this._center;
  },
  forget: function () {
    delete  this._states;
    return this;
  },
  equals: function (box) {
    return (box && box._x1 == this._x1 && box._x2 == this._x2
      && box._y1 == this._y1 && box._y2 == this._y2 && box._z1 == this._z1 && box._z2 == this._z2)
  },//
  inside: function (box) {
    return (box && box._x1 <= this._x1 && box._x2 >= this._x2
      && box._y1 <= this._y1 && box._y2 >= this._y2 && box._z1 <= this._z1 && box._z2 >= this._z2)
  },//
  _resetBounds: function () {
    var c = this.center, cx = c.x, cy = c.y, cz = c.z, h = this._hh, w = this._hw, d = this._hd;
    this._x1 = cx - w;
    this._x2 = cx + w;
    this._y1 = cy - h;
    this._y2 = cy + h;
    this._z1 = cz - d;
    this._z2 = cz + d;
    return this;
  },
  _constructPoints: function () {
    var V = bgl.math.Vector3, d = this._hd, h = this._hh, w = this._hw, cv = this._center,
      x = cv.x, y = cv.y, z = cv.z,
      points = [new V(x + w, y + h, z + d), new V(x - w, y + h, z + d), new V(x + w, y - h, z + d), new V(x + w, y + h, z - d),
        new V(x - w, y + h, z - d), new V(x - w, y - h, z + d), new V(x + w, y - h, z - d), new V(x - w, y - h, z - d)];
    this._points = points;
    this._resetBounds();
    return points;
  },//
  _fromPoints: function (points) {
    if (!points || points.length == 0) return this.constructor.NULL;
    var x1 = points.min('x'), x2 = points.max('x'), y1 = points.min('y'), y2 = points.max('y'),
      z1 = points.min('z'), z2 = points.max('z'), V = bgl.math.Vector3;
    this._hd = (z2 - z1) / 2;
    this._hh = (y2 - y1) / 2;
    this._hw = (x2 - x1) / 2;
    this._center = new V((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2);
    this._points = [new V(x1, y1, z1), new V(x2, y1, z1), new V(x1, y2, z1), new V(x1, y1, z2),
      new V(x2, y1, z2), new V(x2, y2, z1), new V(x1, y2, z2), new V(x2, y2, z2)];
    this._x1 = x1;
    this._x2 = x2;
    this._y1 = y1;
    this._y2 = y2;
    this._z1 = z1;
    this._z2 = z2;
    return this;
  },
  overlap: function (box) {
    return(box && !(this._x2 < box._x1 || this._x1 > box._x2) && !(this._y2 < box._y1 || this._y1 > box._y2) && !(this._z2 < box._z1 || this._z1 > box._z2));
  },//
  union: function (boxOrPoints, overWrite) {
    var pts;
    if (boxOrPoints.points)
      pts = boxOrPoints.points;
    else pts = boxOrPoints;
    pts = pts.concat(this.points);
    if (overWrite !== false)
      return this._fromPoints(pts);
    else return new this.constructor(pts);
  },//
  copy: function (src, des) {
    des = des || new this.constructor();
    src.allOwnPros(function (value, name) {
      if (typeof value != "object")
        des[name] = value;
      else if (value.paste)
        des[name] = value.paste();
    });
    return des;
  },//
  concat: function (mat) {
    var points = this.points;
    points.forEach(function (p) {
      p.concat(mat)
    });
    return this._fromPoints(points)
  },//
  save: function () {
    var s = {_center: this._center.paste()}, ss = (this._states || []);
    this.allOwnPros(function (v, n) {
      if (typeof v !== "object") s[n] = v;
    });
    ss.push(s);
    if (!this._states)this._states = ss;
    return this;
  },//
  restore: function (repeat) {
    var states = this._states, s, c, that;
    if (states) {
      c = states.length;
      that = this;
      if (!c)return this;
      else if (repeat >= c) repeat = c - 1;
      states.length = c - (repeat || 0);
      s = states.pop();
      s.allOwnPros(function (value, name) {
        that[name] = value;
      });
      this._points = null;
    }
    return this;
  },//
  paste: function () {
    var c = this._center;
    return new this.constructor(c.x, c.y, c.z, this._hw, this._hh, this._hw);
  }//
};
bgl.cull.CullLeaf.prototype = {
  constructor: bgl.cull.CullLeaf,
  get geometry() {
    return this._refer;
  },
  get modelBound() {
    return this._mBound;
  },
  get worldBound() {
    var w = this._wBound;
    if (!w) {
      w = this.modelBound.paste().concat(this.worldMatrix);
      this._wBound = w;
    }
    return w;
  },
  get modelMatrix() {
    return this._mMatrix;
  },
  get worldMatrix() {
    var m = this._wMatrix;
    if (!this._wMatrix) {
      var p = this.parent;
      m = p ? this.parent.worldMatrix.paste().concat(this.modelMatrix) : this.modelBound.paste();
      this._wMatrix = m;
    }
    return m;
  },
  set modelBound(bound) {
    var ob = this.modelBound;
    if (!(bound instanceof bgl.cull.BoundBox) || ob.equals(bound))return;
    this._mBound = bound;
    this._wBound = bound.concat(this.worldMatrix);
    this._clearParentStates();
  },
  set modelMatrix(mat) {
    var om = this.modelMatrix;
    if (!(mat instanceof bgl.math.Matrix4) || om.equals(mat))return;
    this._mMatrix = mat;
    this._wMatrix = this.worldMatrix;
    this._clearParentStates();
  },
  get parent() {
    return this._parent;
  },
  cull: function (camera) {
    this._culled = !camera.contains(this.worldBound);
  },
  _clearParentStates: function () {
    var p = this.parent;
    if (p && !this.worldBound.inside(p.worldBound)) {
      p._wBound = p._culled = null;
      p._clearParentStates();
    }
    return this;
  },
  save: function () {
    this.modelBound.save();
    this.modelMatrix.save();
    return this;
  },
  forget: function () {
    this.modelBound.forget();
    this.modelMatrix.forget();
    return this;
  },
  restore: function (repeat) {
    this.modelBound.restore(repeat);
    this.modelMatrix.restore(repeat);
    return this._clearSelfStates();
  },
  _clearSelfStates: function () {
    this._culled = null;
    this._wMatrix = null;
    this._wBound = null;
    return this;
  },
  concat: function (mat) {
    this.modelMatrix.concat(mat);
    //this.modelBound.concat(mat);
    return this._clearSelfStates()._clearParentStates();
  },
  dispose: function () {
    var p = this.parent, refer = this._refer;
    if (p)p.remove(this);
    if (refer) delete refer._culler;
  }
};
bgl.cull.CullNode.prototype = {
  constructor: bgl.cull.CullNode,
  save: function () {
    this.modelMatrix.save();
    return this;
  },
  forget: function () {
    this.modelMatrix.forget();
  },
  restore: function (repeat) {
    this.modelMatrix.restore(repeat);
    return this._clearSelfStates()._clearParentStates();
  },
  dispose: function () {
    var p = this.parent, refer = this._refer;
    if (p)p.remove(this);
    if (refer) delete refer._culler;
  },
  remove: function (nodeOrLeaf) {
    var r = nodeOrLeaf._nodes ? this._nodes.remove(nodeOrLeaf) : this._leaves.remove(nodeOrLeaf);
    if (r) {
      r._parent = null;
      if (r._culled === false) {
        this._clearParentStates();
        this._culled = null;
        this._mBound = null;
      }
    }
    return r;
  },
  add: function (nodeOrLeaf) {
    if (nodeOrLeaf.parent) return false;
    var ob = this.worldBound;
    if (nodeOrLeaf instanceof bgl.cull.CullLeaf && this._leaves.add(nodeOrLeaf));
    else if (nodeOrLeaf instanceof bgl.cull.CullNode && this._nodes.add(nodeOrLeaf)) {
      var ls = this._leaves;
      nodeOrLeaf._leaves.forEach((function (l) {
        ls.add(l);
      }));
      nodeOrLeaf._clearLeavesStates()._clearChildrenStates();
    }
    else return false;
    nodeOrLeaf._parent = this;
    nodeOrLeaf._clearSelfStates();
    if (!nodeOrLeaf.worldBound.inside(ob)) {
      this._wBound = this.worldBound.union(nodeOrLeaf.worldBound, true);
      this._culled = null;
      this._clearParentStates();
    }
    return true;
  },
  _clearSelfStates: function () {
    this._wBound = this._wMatrix = this._culled = null;
    return this;
  },
  _clearParentStates: function () {
    var p = this.parent;
    if (p && !this.worldBound.inside(p.worldBound)) {
      p._wBound = p._culled = null;
      p._clearParentStates();
    }
    return this;
  },
  _clearLeavesStates: function () {
    for (var cs = this._leaves, c = cs[0], i = 0; c; c = cs[++i])
      c._clearSelfStates();
    return this;
  },
  _clearChildrenStates: function () {
    for (var cs = this._nodes, c = cs[0], i = 0; c; c = cs[++i])
      c._clearSelfStates()._clearLeavesStates()._clearChildrenStates();
    return this;
  },
  concat: function (mat) {
    this.modelMatrix.concat(mat);
    return this._clearSelfStates()._clearParentStates()._clearLeavesStates()._clearChildrenStates();
  },
  cull: function (camera, cascade) {
    if (camera.contains(this.worldBound)) {
      var cs, c, i;
      this._culled = false;
      for (cs = this._leaves, c = cs[0], i = 0; c; c = cs[++i])
        c.cull(camera);
      if (cascade)
        for (cs = this._nodes, c = cs[0], i = 0; c; c = cs[++i])
          c.cull(camera, true);
    }
    else
      this._culled = true;
  },
  get worldBound() {
    var m = this._wBound;
    if (!m) {
      var bounds = this._leaves.concat(this._nodes), i, l, points = [];
      if (bounds.length == 0) return bgl.cull.BoundBox.NULL;
      for (i = 0, l = bounds[0]; l; l = bounds[++i])
        points = points.concat(l.worldBound.points);
      m = new bgl.cull.BoundBox(points);
    }
    return m;
  },
  get modelMatrix() {
    return this._mMatrix;
  },
  get worldMatrix() {
    var m = this._wMatrix;
    if (!this._wMatrix) {
      var p = this.parent;
      m = p ? p.worldMatrix.paste().concat(this.modelMatrix) : this.modelMatrix.paste();
      this._wMatrix = m;
    }
    return m;
  },
  set modelMatrix(mat) {
    var om = this.modelMatrix;
    if (!(mat instanceof bgl.math.Matrix4) || om.equals(mat))return;
    this._mMatrix = mat;
    this._clearParentStates();
    this._clearChildrenStates();
  },
  get parent() {
    return this._parent;
  }
};
bgl.cull.BoundBox.NULL = (function () {
  var b = new bgl.cull.BoundBox();
  b._points = [];
  b._x1 = b._x2 = b._y1 = b._y2 = b._z1 = b._z2 = 0;
  b.inside = function () {
    return true;
  };
  b.union = function (box, overWrite) {
    if (overWrite !== false) return box.paste();
    else return box;
  };
  b.concat = function () {
    return this;
  };
  b.overlap = function () {
    return true;
  };
  b.save = function () {
    return this;
  };
  b.restore = function () {
    this._points = [];
    this._hh = this._hd = this._hw = 0;
    return this;
  };
  b.forget = function () {
  };
  b.paste = function () {
    return this;
  };
  b.restore();
  return b;
})();

bgl.resource = {
  ResourceManager: function (cfg) {
    var gl = cfg.gl;
    this.gl = gl;
    this._maxActiveTexureNum = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS) - 1;
    this._maxCubeTextureNum = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
    this._max2DTextureNum = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    this._maxFrameBufferNum = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    this._maxRenderBufferNum = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    this._maxBufferNum = 2048;
    this._texture2DS = [];
    this._textureCubes = [];
    this._buffers = [];
    this._renderBuffers = [];
    this._frameBuffers = [];
    for (var i = 0, u = [], len = this._maxActiveTexureNum; i < len; i++)
      u[i] = 0;
    this._indexUsage = u;
    this._bindingTexture = this._bindingBuffer = this._bindingFrameBuffer = null;
    this._activeIndex = undefined;
  },
  Buffer: function (data, type, usage) {
    this._type = type || WebGLRenderingContext.ARRAY_BUFFER;
    if (data)
      this.data = data;
    this._bo = null;
    this.usage = usage || WebGLRenderingContext.STATIC_DRAW;
    this._buffered = false;
    this._refCount = 0;
  },
  Texture: function (isCube) {
    this._to = null;
    this._index = -1;
    this._type = isCube ? WebGLRenderingContext.TEXTURE_CUBE_MAP : WebGLRenderingContext.TEXTURE_2D;
    this._refCount = 0;
  },
  FrameBuffer: function (width, height, useDepthBuffer) {
    this._w = width || 0;
    this._h = height || 0;
    this._depthBuffer = useDepthBuffer ? new bgl.resource.RenderBuffer() : null;
    this._texture = new bgl.resource.Texture(false);
    this._index = null;
    this._fbo = null;
    this._buffered = false;
    this.imgParam = {
      TEXTURE_MAG_FILTER: 'LINEAR',
      TEXTURE_MIN_FILTER: 'LINEAR',
      TEXTURE_WRAP_S: 'CLAMP_TO_EDGE',
      TEXTURE_WRAP_T: 'CLAMP_TO_EDGE'
    };
    this._refCount = 0;
  },
  RenderBuffer: function () {
    this._rbo = null;
    this._refCount = 0;
  }
};
bgl.resource.RenderBuffer.prototype = {
  get glObj() {
    return this._rbo;
  },
  release: function () {
    var rbo = this._rbo;
    this._refCount = 0;
    if (rbo) {
      rbo.refer = null;
      this._rbo = null;
    }
    this._buffered = false;
  },
  bind: function (gl) {
    var rbo = this.glObj;
    if (!rbo) {
      this._rbo = rbo = gl.cfg.resManager.getRenderBufferObj(this);
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
    this._refCount++;
  }
};
bgl.resource.FrameBuffer.prototype = {
  get glObj() {
    return this._fbo;
  },
  get depthBuffer() {
    return this._depthBuffer;
  },
  get texture() {
    return this._texture;
  },
  releaseDepthBuffer: function () {
    var db = this.depthBuffer;
    if (db)db.release();
  },
  releaseTexture: function () {
    var tex = this.texture;
    if (tex) tex.releaseTexture();
    this._texture = null;
  },
  release: function () {
    this._fbo = null;
    this._refCount = 0;
    this._buffered = false;
  },
  bind: function (gl) {
    this._refCount++;
    if (!this.bufferData(gl))
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._fbo);
    this._fbo._manager.bindingFrameBuffer = this;
  },
  bufferData: function (gl) {
    if (!this._buffered) {
      var mng = gl.cfg.resManager, fbo = this._fbo, texture = this._texture, depthBuffer = this._depthBuffer,
        w = this._w || gl.canvas.width, h = this._h || gl.canvas.height;
      if (!fbo)this._fbo = fbo = mng.getFrameBufferObj(this);
      texture.bind(gl);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      this.imgParam.allOwnPros(function (value, name) {
        gl.texParameteri(gl.TEXTURE_2D, gl[name], gl[value]);
      });
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.glObj, 0);
      if (depthBuffer) {
        depthBuffer.bind(gl);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer.glObj);
      }
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw Error('framebuffer fail');
      this._buffered = true;
      return true;
    }
    return false;
  },
  set width(v) {
    v = parseInt(v);
    if (!v || this._w == v)return;
    this._w = v;
    this._buffered = false;
  },
  set height(v) {
    v = parseInt(v);
    if (!v || this._h == v)return;
    this._h = v;
    this._buffered = false;
  }
};
bgl.resource.Buffer.prototype = {
  get glObj() {
    return this._bo;
  },
  dispose: function () {

  },
  release: function () {
    var bo = this._bo;
    this._refCount = 0;
    if (bo) {
      bo.refer = null;
      this._bo = null;
    }
    this._buffered = false;
  },
  get buffered() {
    return this._buffered;
  },
  get data() {
    return this._data;
  },
  set data(val) {
    if (!val || val === this._data || !val.length) return;
    if (WebGLRenderingContext.ARRAY_BUFFER === this._type)
      this._data = val instanceof Float32Array ? val : new Float32Array(val);
    else
      this._data = val instanceof Int16Array ? val : new Int16Array(val);
    this._buffered = false;
    this.length = val.length;
  },
  bufferData: function (gl) {
    if (!this._buffered) {
      var bo = this._bo, mng = gl.cfg.resManager;
      if (!bo) {
        this._bo = mng.getBufferObj(this);
      }
      mng.bindingBuffer = this;
      gl.bufferData(this._type, this._data, this.usage);
      this._buffered = true;
      return true;
    }
    return false;
  },
  bind: function (gl) {
    if (!this.bufferData(gl))
      gl.cfg.resManager.bindingBuffer = this;
    this._refCount++;
  }
};
bgl.resource.Texture.prototype = {
  get glObj() {
    return this._to;
  },
  get refCount() {
    return this._refCount;
  },
  set refCount(ref) {
    var or = this._refCount, dis = ref - or;
    this._refCount = ref;
    this.glObj._manager._indexUsage[this._index] += dis;
  },
  release: function () {
    var to = this.glObj, mng = to._manager;
    this.refCount = 0;
    to._refer = null;
    this._buffered = false;
    mng.calculateIndexUsage();
    bgl.resource.Texture.apply(this, [this._type]);
  },
  bind: function (gl) {
    var to = this._to, index = this._index, mng = gl.cfg.resManager;
    if (!to)
      this._to = mng.getTextureObj(this);
    if (index == -1)
      this._index = index = mng.getMinUsedTexIndex(false);
    this._buffered = true;
    mng.activeIndex = index;
    mng.bindingTexture = this;
    this.refCount++;
  },
  dispose: function () {
    var mng = this._manager, texs = this._type == WebGLRenderingContext.TEXTURE_CUBE_MAP ? mng._textureCubes : mng._texture2DS;
    this.release();
    texs.remove(this);
    mng.gl.deleteTexture(this._texture);
    mng.calculateIndexUsage();
  }
};
bgl.resource.ResourceManager.prototype = {
  set bindingBuffer(b) {
    var ob = this._bindingBuffer;
    if (b instanceof bgl.resource.Buffer) {
      var gl = this.gl, bo = b.glObj;
      if (ob && ob.glObj === bo)return;
      gl.bindBuffer(b._type, bo);
      this._bindingBuffer = b;
    }
  },
  set bindingTexture(t) {
    var ot = this._bindingTexture;
    if (t instanceof bgl.resource.Texture) {
      var gl = this.gl, to = t.glObj;
      if (ot && ot.glObj == to) return;
      gl.bindTexture(t._type || WebGLRenderingContext.TEXTURE_2D, to);
      this._bindingTexture = t;
    }
  },
  set bindingFrameBuffer(f) {
    var of = this._bindingFrameBuffer, gl, fbo;
    if (f instanceof bgl.resource.FrameBuffer) {
      fbo = f.glObj;
      if (of && of.glObj === fbo)return;
    }
    else if (f == null)
      fbo = null;
    else return;
    gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    this._bindingFrameBuffer = f;
  },
  get activeIndex() {
    return this._activeIndex;
  },
  set activeIndex(index) {
    if (this.activeIndex != index) {
      var gl = this.gl;
      gl.activeTexture(WebGLRenderingContext['TEXTURE' + index]);
      this._activeIndex = index;
    }
  },
  get texture2DCount() {
    return this._texture2DS.length;
  },
  get textureCubeCount() {
    return this._textureCubes.length;
  },
  thrill: function () {
    for (var i = 0, ts = this._texture2DS, t = ts[0]; t; t = ts[++i])
      t._refCount--;
    for (i = 0, ts = this._textureCubes, t = ts[0]; t; t = ts[++i])
      t._refCount--;
    for (i = 0, ts = this._frameBuffers, t = ts[0]; t; t = ts[++i])
      if (t.refer) t.refer._refCount--;
    this.calculateIndexUsage();
  },
  _getResource: function (refer, maxNum, resArray, createFun) {
    if (!refer.release) throw 'refer should implement release';
    var glObj;
    this.thrill();
    if (resArray.length < maxNum) {
      glObj = createFun.apply(this.gl);
      resArray.add(glObj);
      glObj._manager = this;
    }
    else {
      glObj = this.getMinUsedResource(resArray);
      if (glObj.refer) glObj.refer.release();
    }
    glObj.refer = refer;
    return glObj;
  },
  getRenderBufferObj: function (refer) {
    return this._getResource(refer, this._maxRenderBufferNum, this._renderBuffers, this.gl.createRenderbuffer);
  },
  getFrameBufferObj: function (refer) {
    return this._getResource(refer, this._maxFrameBufferNum, this._frameBuffers, this.gl.createFramebuffer);
  },
  getBufferObj: function (refer) {
    return this._getResource(refer, this._maxBufferNum, this._buffers, this.gl.createBuffer);
  },
  getTextureObj: function (refer, isCube) {
    if (!refer.release) throw Error('refer should release');
    return isCube ? this._getResource(refer, this._maxCubeTextureNum, this._textureCubes, this.gl.createTexture) :
      this._getResource(refer, this._max2DTextureNum, this._texture2DS, this.gl.createTexture);
  },
  getMinUsedResource: function (storageArray) {
    for (var i = 0, buffers = storageArray, buffer = buffers[0], s = buffer; buffer; buffer = buffers = [++i])
      if (!buffer.refer) return buffer;
      else if (buffer.refer._refCount < s.refer._refCount) s = buffer;
    return s;
  },
  getMinUsedTexIndex: function (recalculate) {
    if (recalculate)
      this.calculateIndexUsage();
    var ua = this._indexUsage, min = ua[0];
    ua.forEach(function (v) {
      if (v < min)min = v
    });
    return this._indexUsage.indexOf(min);
  },
  calculateIndexUsage: function () {
    var us = this._indexUsage, c = function (t) {
      us[t._index] += t._refCount;
    };
    for (var i = 0, len = us.length; i < len; i++)
      us[i] = 0;
    this._texture2DS.forEach(c);
    this._textureCubes.forEach(c);
  }
};
bgl.data = {
  cubic: {
    vertexArray: new Float32Array([ 1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1, 1, -1, -1, 1, 1, -1, -1, 1, -1, -1, -1, -1]),
    vertexIndecies: new Uint16Array([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5, 0, 5, 6, 0, 6, 1, 1, 6, 7, 1, 7, 2, 7, 4, 3, 7, 3, 2, 4, 7, 6, 4, 6, 5 ]),
    vertexUV: new Float32Array([// Front face
      1.0, 1.0, 1.0, 1 / 3, 0.5, //v0
      -1.0, 1.0, 1.0, 0, 0.5, //v1
      -1.0, -1.0, 1.0, 0, 1, //v2
      1.0, -1.0, 1.0, 1 / 3, 1, //v3 // Back face
      1.0, 1.0, -1.0, 1 / 3, 0,//v4
      -1.0, 1.0, -1.0, 2 / 3, 0,//v5
      -1.0, -1.0, -1.0, 2 / 3, 0.5,//v6
      1.0, -1.0, -1.0, 1 / 3, 0.5,//v7// Left face
      -1.0, 1.0, 1.0, 2 / 3, 0.5,//v8
      -1.0, 1.0, -1.0, 1 / 3, 0.5,//v9
      -1.0, -1.0, -1.0, 1 / 3, 1,//v10
      -1.0, -1.0, 1.0, 2 / 3, 1,//v11// Right face
      1.0, 1.0, 1.0, 2 / 3, 0.5,//12
      1.0, -1.0, 1.0, 2 / 3, 1,//13
      1.0, -1.0, -1.0, 1, 1,//14
      1.0, 1.0, -1.0, 1, 0.5,//15// Top face
      1.0, 1.0, 1.0, 0, 0,//v16
      1.0, 1.0, -1.0, 0, 0.5,//v17
      -1.0, 1.0, -1.0, 1 / 3, 0.5,//v18
      -1.0, 1.0, 1.0, 1 / 3, 0,//v19// Bottom face
      1.0, -1.0, 1.0, 2 / 3, 0.5,//v20
      1.0, -1.0, -1.0, 2 / 3, 0,//v21
      -1.0, -1.0, -1.0, 1, 0,//v22
      -1.0, -1.0, 1.0, 1, .5//v23
    ]),
    uv: new Float32Array([
        1 / 3, 0.5, //v0
      0, 0.5, //v1
      0, 1, //v2
        1 / 3, 1, //v3
        1 / 3, 0, //v4
        2 / 3, 0, //v5
        2 / 3, 0.5,//v6
        1 / 3, 0.5, //v7
        2 / 3, 0.5,//v8
        1 / 3, 0.5,//v9
        1 / 3, 1,//v10
        2 / 3, 1,//v11
        2 / 3, 0.5,//12
        2 / 3, 1,//13
      1, 1,//14
      1, 0.5,//15
      0, 0,//v16
      0, 0.5,//v17
        1 / 3, 0.5,//v18
        1 / 3, 0,//v19
        2 / 3, 0.5,
        2 / 3, 0,
      1, 0,
      1, 0.5
    ]),
    uvIndex: new Uint16Array([
      0, 1, 2, 0, 2, 3,    // Front face
      4, 6, 5, 4, 7, 6,    // Back face
      8, 9, 10, 8, 10, 11,  // Left face
      12, 13, 14, 12, 14, 15, // Right face
      16, 17, 18, 16, 18, 19, // Top face
      20, 22, 21, 20, 23, 22  // Bottom face
    ])
  },
  matrix: {
    RGB2XYZ: new bgl.math.Matrix3([.4124, .2126729, .0193339, .3575761, .7152, .1191920, .1804375, .072175, .9503041]),
    XYZ2RGB: new bgl.math.Matrix3([3.241, -.9692660, .0556434, -1.5371385, 1.8760108, -.2040259, -.4985314, .041556, 1.0572252])
    //RGB2XYZ: new bgl.math.Matrix3([.4124,.3576,.1805,.2126,.7152,.0722,.0193,.1192,.9505]),
    // XYZ2RGB: new bgl.math.Matrix3([3.2406,-1.5374, -.4986, -.9692,-1.876,.0416,.0556, -.204,1.057])
  },
  arrow: {
    vertex: [-0.0265, -0.2473, 1, 0.7838, -0.2474, 0.1405, 0.7838, 0.2474, 0.1405, -0.0265, 0.2474, 1, 0.2108, -0.2474,
      0.3137, 0.2108, 0.2474, 0.3137, 0.2108, -0.2474, -1, 0.2108, 0.2473, -1, -0.2382, -0.2474, -1, -0.2382, 0.2473,
      -1, -0.2382, -0.2474, 0.3137, -0.2382, 0.2474, 0.3137, -0.7838, -0.2474, 0.1405, -0.7838, 0.2474, 0.1405],
    indices: [0, 1, 2, 0, 2, 3, 1, 4, 5, 1, 5, 2, 4, 6, 7, 4, 7, 5, 6, 8, 9, 6, 9, 7, 8, 10, 11, 8, 11, 9, 10, 12,
      13, 10, 13, 11, 12, 0, 3, 12, 3, 13, 0, 4, 1, 10, 0, 12, 10, 4, 0, 6, 10, 8, 4, 10, 6, 3, 2, 5, 11, 13, 3, 11,
      3, 5, 7, 9, 11, 5, 7, 11]
  }
};
(function () {
  var table = [.5926, .3334, .0740, .5678, .3319, .1004, .5485, .3318, .1197, .5323, .3322, .1355, .5181, .3327, .1492, .5055, .3333, .1613, .4941, .3338, .1721, .4838, .3342, .1821, .4743, .3345, .1912, .4655, .3348, .1997, .4574, .3350, .2076, .4499, .3351, .2150, .4428, .3352, .2219, .4362, .3353, .2285, .4300, .3353, .2347, .4242, .3352, .2405, .4188, .3352, .2461, .4136, .3351, .2513, .4087, .3349, .2563, .4041, .3348, .2611, .3997, .3346, .2657, .3955, .3344, .2700, .3916, .3342, .2742, .3878, .3340, .2782, .3842, .3338, .2820, .3808, .3336, .2857, .3775, .3333, .2892, .3743, .3331, .2926, .3713, .3328, .2959, .3684, .3326, .2990, .3657, .3323, .3020, .3630, .3320, .3049, .3605, .3318, .3077, .3580, .3315, .3105, .3557, .3313, .3131, .3534, .3310, .3156, .3512, .3307, .3181, .3491, .3305, .3204, .3471, .3302, .3227, .3451, .3299, .3250, .3432, .3297, .3271, .3414, .3294, .3292, .3396, .3292, .3312, .3379, .3289, .3332, .3362, .3287, .3351, .3346, .3284, .3370, .3331, .3282, .3388, .3315, .3279, .3405, .3301, .3277, .3423, .3287, .3274, .3439, .3273, .3272, .3455, .3259, .3270, .3471, .3246, .3267, .3486, .3234, .3265, .3501, .3221, .3263, .3516, .3209, .3260, .3530, .3198, .3258, .3544, .3186, .3256, .3558, .3175, .3254, .3571, .3165, .3252, .3584, .3154, .3249, .3596, .3144, .3247, .3609, .3134, .3245, .3621, .3124, .3243, .3632, .3115, .3241, .3644, .3106, .3239, .3655, .3097, .3237, .3666, .3088, .3235, .3677, .3079, .3233, .3687, .3071, .3232, .3698, .3063, .3230, .3708, .3055, .3228, .3717, .3047, .3226, .3727, .3039, .3224, .3737, .3032, .3222, .3746, .3024, .3221, .3755, .3017, .3219, .3764, .3010, .3217, .3773, .3003, .3216, .3781, .2997, .3214, .3789, .2990, .3212, .3798];

  function roundIndex(val) {
    val = val || 3000;
    val = Math.round(parseInt(val) / 100 - 20) * 3;
    if (val < 0 || val > table.length) throw 'invalid value';
    return val;
  }

  bgl.data.getRGBRatio = function (val, base) {
    var r = 0, g = 0, b = 0, sum, index;
    if (val < 1 / 6) {
      r = 1;
      g = val * 6;
    } else if (val < 1 / 3) {
      r = 2 - 6 * val;
      g = 1;
    } else if (val < 1 / 2) {
      g = 1;
      b = val * 6 - 2;
    } else if (val < 2 / 3) {
      g = 4 - 6 * val;
      b = 1;
    } else if (val < 5 / 6) {
      g = 6 * val - 4;
      b = 1;
    } else {
      r = 1;
      b = 6 - 6 * val;
    }
    sum = r + g + b;
    if (sum == 0) return new bgl.math.Vector3();
    index = roundIndex(base);
    return new bgl.math.Vector3(r / (sum * table[index]), g / (sum * table[index + 1]), b / (sum * table[index + 2]));
  };
  bgl.data.getTemRatio = function (target, base) {
    var ti = roundIndex(target), bi = roundIndex(base), t = new bgl.math.Vector3(), e = t.elements;
    for (var i = 0; i < 3; i++)
      e[i] = table[ti + i] / table[bi + i];
    return t;
  }
})();
(function () {
  var f = function (name, obj) {
      var options = {
        enumerable: false,
        configurable: true,
        get: new Function('return this._' + name + ';'),
        set: new Function('val', ('if (isNaN(val) || val == this._{0}) return;' +
          'this._{0} = val;this.reset();').format(name))
      };
      Object.defineProperty(obj, name, options);
    },
    pro = bgl.model.Camera.prototype;
  ['near', 'far', 'aspect'].forEach(function (name) {
    f(name, pro)
  });
}());
(function () {
  var fbody, box = bgl.cull.BoundBox.prototype,
    leaf = bgl.cull.CullLeaf.prototype,
    node = bgl.cull.CullNode.prototype, fun, name,
    render = bgl.model.Render.prototype,
    geo = bgl.model.Geometry.prototype,
    camera = bgl.model.Camera.prototype;
  [
    {name: 'Translate', params: "'x','y','z'"},
    {name: 'Scale', params: "'x','y','z'"},
    {name: 'Rotate', params: "'a','x','y','z'"}
  ].forEach(function (p) {
      fbody = 'return this.concat(bgl.math.Matrix4.set{0}({1}));'.format(p.name, p.params.replace(/'/g, ''));
      fun = eval("new Function({0},'{1}')".format(p.params, fbody));
      name = p.name.toLowerCase();
      box[name] = fun;
      node[name] = fun;
      leaf[name] = fun;
      render[name] = fun;
      geo[name] = fun;
      camera[name] = fun;
    });
  ['model', 'foundation', 'math'].forEach(function (name) {
    var namespace = bgl[name], classNames = Object.getOwnPropertyNames(namespace), c, cname, i;
    for (i = 0, cname = classNames[0]; cname; cname = classNames[++i]) {
      bgl[cname] = namespace[cname];
    }
  });
})();

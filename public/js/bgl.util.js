/**
 * Created by 柏然 on 2014/6/17.
 */
if (bgl)
  /**
   *
   * @param canvas
   * @param option {object} maxLG 最大灯组数量
   * @returns {{}}
   */
  bgl.pls = function (canvas, option) {
    var expoter = {
      normalLocation: option.normalLocation || {x: 512, y: 100, w: 512, h: 512},
      expandLocation: {x: 0, y: 0, w: document.documentElement.clientWidth, h: document.documentElement.clientHeight},
      adjustCanvas: function (cvs, expand) {
        var param, style = (cvs || canvas).style;
        if (expand) {
          param = expoter.expandLocation;
          style.zIndex = 100;
          style.position = 'absolute';
          style.marginTop = 0;
        } else {
          param = expoter.normalLocation;
          style.zIndex = -1;
          style.position = 'relative';
          style.marginTop = -param.y + 'px';
        }
        style.left = param.x + 'px';
        style.top = param.y + 'px';
        renderFrameBuffer.width = renderConfig.width = param.w;
        renderFrameBuffer.height = renderConfig.height = param.h;
        expoter.expanded = !!expand;
      },
      maxTextureSize: 4096
    }, roomRender, roomBlender, renderConfig, renderFrameBuffer;
    Object.defineProperty(expoter, 'visible', {
      get: function () {
        return canvas.style.display != 'none';
      },
      set: function (v) {
        renderConfig.scenes[0].invalid();
        canvas.style.display = v ? 'block' : 'none';
      }
    });
    expoter.debug = function debug() {
      var geos = roomRender._geometries, e = roomBlender.findBinder('uCalParam').value.elements, tem;
      console.log('uSumIntensity:{0}'.format(roomBlender.findBinder('uSumIntensity').value));
      console.log('A:{0},B{1}'.format(e[0], e[1]));
      geos.forEach(function (g, i) {
        if (!g.enable)return;
        tem = g.binders['uTemRatio']._val.elements;
        console.log('geo {0}:intensity {1},tem x:{2} y:{3} z{4}'
          .format(i, g.binders['uIntensity'].value, tem[0], tem[1], tem[2]));
      })
    };
    expoter.changeSumIntensity = function sumIntensity(sum) {
      sum = parseInt(sum);
      if (!sum || sum <= 0) return console.warn('sumIntensity must larger than 0');
      roomBlender.findBinder('uSumIntensity').value = sum;
      roomRender.findBinder('uSumIntensity').value = sum;
      return sum;
    };
    expoter.reset = function (lgNum) {
      var geos = roomRender._geometries, camera = roomRender.scene.camera, at = camera._at;
      for (var i = 0, geo = geos[0]; geo; geo = geos[++i]) {
        geo.binders['uIntensity'].value = 0;
        if (i >= lgNum) geo.enable = false;
      }
      roomBlender.findBinder('uSumIntensity').value = lgNum;
      roomRender.findBinder('uSumIntensity').value = lgNum;
      // camera.restore();
      // camera.save();
      camera.translate(-at.x, -at.y, -at.z);
    };
    expoter.turnOff = function () {
      roomRender._geometries.forEach(function (g) {
        g.enable = false;
      });
    };
    expoter.changeIntensity = function (index, value) {
      var uni = roomRender._geometries[index].binders['uIntensity'], ov = uni._val;
      if (ov == value)return ov;
      roomRender._geometries[index].enable = value != 0;
      return uni.value = value;
    };
    expoter.changeImg = function (index, img) {
      var geo = roomRender._geometries[index];
      if (!img) {
        geo.findBinder('sEnv0').img = img;
        return expoter.changeIntensity(index, 0);
      }
      else if (!(img instanceof Image) || !img.src || !img.complete)
        throw 'img not loaded';
      geo.findBinder('sEnv0').img = img;
      geo.enable = true;
      return geo;
    };
    expoter.changeABK = function (A, B, k) {
      if (A > 3)
        console.log('A太大了，我改成了' + (A = 2.7));
      k = k || 1;
      var e = roomBlender.findBinder('uCalParam').value.elements;
      e[0] = A * k;
      e[1] = B;
      e[2] = k;
    };
    expoter.changeTem = function (index, target, base) {
      return roomRender._geometries[index].findBinder('uTemRatio').value = target <= 0 ? bgl.data.getRGBRatio(-target) : bgl.data.getTemRatio(target, base)
    };
    Object.defineProperty(expoter, 'onmove', {set: function (f) {
      expoter.on('move', f);
    }});
    var shaders = option.shaders || {
      roomVS: 'precision mediump float;attribute vec3 aVertex;attribute vec2 aTexCoord;uniform mat4 uMVPMatrix;varying vec2 vTexCoord;void main(){gl_Position=vec4(aVertex,1.0)*uMVPMatrix;vTexCoord=aTexCoord;}',
      roomFS: 'precision highp float;varying vec2 vTexCoord;uniform sampler2D sEnv0;uniform float uIntensity;uniform float uSumIntensity;uniform mat3 uRGBtoXYZ;uniform mat3 uXYZtoRGB;uniform vec3 uTemRatio;float YRatio(vec3 c0,vec3 xyz){  return (c0*uRGBtoXYZ).y/xyz.y;}vec3 RGBtoXYZ(vec3 rgb){    vec3 xyz=rgb*uTemRatio*uRGBtoXYZ;	return xyz*YRatio(rgb,xyz)*uIntensity;}void main(){vec3 c=RGBtoXYZ(texture2D(sEnv0,vTexCoord).rgb);gl_FragColor=vec4(c*uXYZtoRGB,1.0/uSumIntensity);}', blendVS: 'precision mediump float;attribute vec2 aTexCoord;varying vec2 vTexCoord;void main(){gl_Position=vec4(aTexCoord,0.0,1.0);vTexCoord=vec2(aTexCoord.x*0.5+0.5,aTexCoord.y*0.5+0.5);}',
      blendFS: 'precision highp float;uniform vec4 uCalParam;uniform mat3 uRGBtoXYZ;uniform mat3 uXYZtoRGB;varying vec2 vTexCoord;uniform sampler2D sBuffer;uniform float uSumIntensity;vec3 Reinhard(vec3 xyz,float A, float B){    vec3 res=vec3(0.0);    res.y=xyz.y* A;	res.y=res.y *(1.0+ res.y/B)/(1.0+res.y);	float r=res.y/xyz.y;	res.x=xyz.x*r;	res.z=xyz.z*r;	return res;}vec3 XYZtoRGB(vec3 xyz){ return xyz*uXYZtoRGB;}void main(){ vec3 sumXYZ=texture2D(sBuffer,vTexCoord).rgb*uSumIntensity*uRGBtoXYZ; vec3 res=Reinhard(sumXYZ,uCalParam[0],uCalParam[1]); res=XYZtoRGB(res); gl_FragColor=vec4(res,1.0);}'

    }, config = {
      rootRender: function (rootRender) {
        rootRender.addBinder(function (gl, cfg) {
          cfg.glClear(true);
        }, 'clean');
        rootRender.controller = (function () {
          var clock = new bgl.animation.SimpleClock(10, 360, 1, 0, null, true);
          clock.ontick = function (ov, timeline) {
            timeline.scene.camera.orient((ov - clock.value));
          };
          expoter.autoPlay = function (dur) {
            if (!clock._stopped)return;
            clock.duration = dur || 20;
            clock.restart();
          };
          expoter.manualPlay = function () {
            clock.end();
          };
          return clock;
        })();
      },
      roomRender: function (gl) {
        var render = new bgl.model.Render(), buffer = new bgl.resource.Buffer(bgl.data.cubic.vertexUV),
          size = Float32Array.BYTES_PER_ELEMENT * 5, offset = Float32Array.BYTES_PER_ELEMENT * 3,
          frameBuffer = new bgl.resource.FrameBuffer(expoter.normalLocation.width, expoter.normalLocation.height);
        renderFrameBuffer = frameBuffer;
        render.program = bgl.createProgram(gl, shaders.roomVS, shaders.roomFS);
        render.frameBuffer = frameBuffer;
        render.addBinder(new bgl.foundation.Attribute('aVertex', buffer, size, 0))
          .addBinder(new bgl.foundation.Attribute('aTexCoord', buffer, size, offset))
          .addBinder(new bgl.foundation.Uniform('uSumIntensity', 0))
          .addBinder(new bgl.foundation.Uniform('uRGBtoXYZ', bgl.data.matrix.RGB2XYZ))
          .addBinder(new bgl.foundation.Uniform('uXYZtoRGB', bgl.data.matrix.XYZ2RGB))
          .addBinder(new bgl.foundation.Uniform('uMVPMatrix', render.modelMatrix,
            function (mat, cfg) {
              return cfg.curCamera.mvpMatrix(mat);
            }, true)).
          addBinder(function (gl, cfg) {
            // gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            cfg.curFrameBuffer = frameBuffer;
            cfg.glClear();
          }, 'masker');
        var geos = [], geo, sampler;
        for (var i = 0, len = option.maxLG || 12; i < len; i++) {
          geo = new bgl.model.Geometry(bgl.data.cubic.uvIndex);
          sampler = new bgl.foundation.Sampler2D('sEnv0');
          geo.addBinder(new bgl.foundation.Uniform('uIntensity', 0)).
            addBinder(new bgl.foundation.Uniform('uTemRatio', bgl.data.getTemRatio(3000)));
          geo.enable = false;
          render.add(geo);
          geos[i] = geo.addBinder(sampler);
        }
        roomRender = render;
        return render;
      },
      roomBlender: function (gl) {
        var blender = new bgl.model.Render();
        blender.program = bgl.createProgram(gl, shaders.blendVS, shaders.blendFS);
        blender.addBinder(new bgl.foundation.Attribute('aTexCoord', [-1, 1, 1, 1, 1, -1, -1, -1]))
          .addBinder(new bgl.foundation.Uniform('uSumIntensity', 0))
          .addBinder(new bgl.foundation.Uniform('uRGBtoXYZ', bgl.data.matrix.RGB2XYZ))
          .addBinder(new bgl.foundation.Uniform('uXYZtoRGB', bgl.data.matrix.XYZ2RGB))
          .addBinder(new bgl.foundation.Uniform('uCalParam', new bgl.math.Vector4()))
          .addBinder(function (gl, cfg) {
            var loc = cfg.curProgram.uniforms['sBuffer']._loc, tex = cfg.curFrameBuffer.texture;
            cfg.curFrameBuffer = null;
            tex.bind(gl);
            gl.uniform1i(loc, tex._index);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
          }, 'buffer');
        blender.add(new bgl.model.Geometry([0, 1, 2, 0, 2, 3]));
        Object.defineProperty(expoter, 'blender', {get: function () {
          return blender;
        }});
        roomBlender = blender;
        expoter.blender = blender;
        return blender;
      },
      entryRender: function () {
        var render = new bgl.model.Render();
      },
      eventPool: function (pool) {
        pool.addKeyDefinition('up', 38, 87).addKeyDefinition('down', 83, 40).
          addKeyDefinition('left', 37, 65).addKeyDefinition('right', 39, 68);
        pool.onupdate = function (e, cfg) {
          var touches = [];
          e.forEach(function (evt) {
            if (evt.identifier == 'key')consumeKeyEvt.apply(this, [evt, cfg]);
            else if (evt.identifier == 'mouse')consumeMouseEvt.apply(this, [evt, cfg]);
            else touches.push(evt);
          }, pool);
          if (touches.length) consumeTouchEvt.apply(this, [touches, cfg]);
        }
      },
      camera: function (camera) {
        camera.far = 5;
        camera.fovy = 60;
        camera.move = function (dir) {
          var d = this.to, pos = 0.02, dis;
          switch (dir) {
            case 'down':
              pos *= -1;
              break;
            case 'right':
              d = this.right;
              break;
            case 'left':
              d = this.right;
              pos *= -1;
              break;
          }
          dis = this.at.paste().plus(d.x * pos, 0, d.z * pos);
          if (canMove(this, dis)) {
            camera.translate(d.x * pos, 0, d.z * pos);
            expoter.emit('move', [camera]);
          }
        };
        camera.save();
      }
    };

    function consumeTouchEvt(touches, cfg) {
      switch (touches.length) {
        case 1:
          expoter.manualPlay();
          var touch = touches[0];
          touch.dy = -touch.dy;
          consumeMouseEvt.apply(this, [touch, cfg]);
          break;
        case 2:
          this.shouldClear = true;
          var t1 = touches[0], t2 = touches[1], x1 = t1.dx, x2 = t2.dx, y1 = t1.dy, y2 = t2.dy;
          if (x1 < 0 && x2 < 0) return cfg.curCamera.move('right');
          else if (x2 > 0 && x1 > 0)return  cfg.curCamera.move('left');
          if (y1 < 0 && y2 < 0) return cfg.curCamera.move('down');
          else if (y2 > 0 && y1 > 0) return  cfg.curCamera.move('up');
          if (t1.event == t2.event && t1.eventType == 'drag') {
            var lt = t1.clientX < t2.clientX ? t1 : t2, rt = lt == t1 ? t2 : t1;
            var dt = t1.clientY > t2.clientY ? t1 : t2, ut = dt == t1 ? t2 : t1;
            if (lt.dx > 0 && rt.dx < 0 && dt.dy < 0 && ut.dy > 0)
              expoter.adjustCanvas(cfg.gl.canvas, false);
            else if (lt.dx < 0 && rt.dx > 0 && dt.dy > 0 && ut.dy < 0)
              expoter.adjustCanvas(cfg.gl.canvas, true);
          }
          break;
      }

    }

    function canMove(camera, destination) {
      return Math.abs(destination.x) < 0.5 && Math.abs(destination.z) < 0.5;
    }

    function consumeKeyEvt(e, cfg) {
      expoter.manualPlay();
      cfg.curCamera.move(e.defination);
    }

    function consumeMouseEvt(e, cfg) {
      var mouse = this.pEvents['mouse'], lastMouse;
      if (mouse)lastMouse = mouse[mouse.length - 1];
      if (lastMouse && (lastMouse.eventType == 'click' || lastMouse.eventType == 'press')) {
        this.shouldClear = false;
        expoter.manualPlay();
        lastMouse = mouse[mouse.length - 2];
        if (lastMouse && lastMouse.eventType == 'click') {
          expoter.adjustCanvas(cfg.gl.canvas, !expoter.expanded);
          this.shouldClear = true;
        }
      }
      if (e.eventType == 'drag') {
        orientCamera(cfg.curCamera, -e.dx, -e.dy);
      }
      else if (e.eventType == 'release' && e.accumulatedX / (e.timeStamp - e.startTime) > 2)
        expoter.autoPlay();
    }

    function orientCamera(camera, dx, dy) {
      if (Math.abs(dx) < 2)dx = 0;
      else if (dx < -5)dx = -5;
      else if (dx > 5)dx = 5;
      camera.orient(dx * .3, dy * .5);
    }

    function init(canvas) {
      canvas.width = expoter.normalLocation.w;
      canvas.height = expoter.normalLocation.h;
      var gl = bgl.init(canvas), scene = new bgl.model.Scene(), rootRender = scene.rootRender, cfg = gl.cfg;
      renderConfig = cfg;
      gl.enable(gl.DEPTH_TEST);
      gl.enable(gl.BLEND);
      expoter.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      cfg.add(scene);
      config.rootRender(rootRender);
      rootRender.add(config.roomRender(gl));
      rootRender.add(config.roomBlender(gl));
      config.eventPool(cfg.eventPool);
      config.camera(scene.camera);
      expoter.adjustCanvas(canvas, false);
      Object.defineProperty(expoter, 'onupdate', {set: function (f) {
        cfg.on('update', f)
      }});
      cfg.run();
    }

    var style = canvas.style;

    style.float = 'left';
    init(canvas);
    config = null;
    shaders = null;
    return expoter;
  };
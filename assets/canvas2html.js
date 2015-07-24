'use strict';
window.requestAnimFrame = (function() {
	return  window.requestAnimationFrame       || 
			window.webkitRequestAnimationFrame || 
			window.mozRequestAnimationFrame    || 
			window.oRequestAnimationFrame      || 
			window.msRequestAnimationFrame     || 
			function(/* function */ callback, /* DOMElement */ element){
				window.setTimeout(callback, 1000 / 60);
			};
})();

/**
 * Behaves the same as setTimeout except uses requestAnimationFrame() where possible for better performance
 * @param {function} fn The callback function
 * @param {int} delay The delay in milliseconds
 */

window.requestTimeout = function(fn, delay) {
	if( !window.requestAnimationFrame      	&& 
		!window.webkitRequestAnimationFrame && 
		!(window.mozRequestAnimationFrame && window.mozCancelRequestAnimationFrame) && // Firefox 5 ships without cancel support
		!window.oRequestAnimationFrame      && 
		!window.msRequestAnimationFrame)
			return window.setTimeout(fn, delay);
			
	var start = new Date().getTime(),
		handle = {};
		
	function loop(){
		var current = new Date().getTime(),
			delta = current - start;
			
		delta >= delay ? fn.call() : handle.value = requestAnimFrame(loop);
	}
    loop();
	return handle;
};

/**
 * Behaves the same as clearTimeout except uses cancelRequestAnimationFrame() where possible for better performance
 * @param {int|object} fn The callback function
 */
window.clearRequestTimeout = function(handle) {
    if(!handle) {return;}
    window.cancelAnimationFrame ? window.cancelAnimationFrame(handle.value) :
    window.webkitCancelAnimationFrame ? window.webkitCancelAnimationFrame(handle.value) :
    window.webkitCancelRequestAnimationFrame ? window.webkitCancelRequestAnimationFrame(handle.value) : /* Support for legacy API */
    window.mozCancelRequestAnimationFrame ? window.mozCancelRequestAnimationFrame(handle.value) :
    window.oCancelRequestAnimationFrame	? window.oCancelRequestAnimationFrame(handle.value) :
    window.msCancelRequestAnimationFrame ? window.msCancelRequestAnimationFrame(handle.value) :
    clearTimeout(handle);
};

var preventDefault = function (evt) {
    evt.stopPropagation();
    evt.preventDefault();
};
///////////////// dragging /////////////////////
var events;
if ('ontouchstart' in  window) {
    events = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];
} else {
    events = ['mousedown', 'mousemove', 'mouseup'];
}

var App = function(cfg) {
	/*
		cfg = {
			warpId 
			pageNum 
			audioSrc
			desingWidth
			desingHeight
			page: [
				{
					string 背景图地址
					string 渲染类型 0平铺1拉伸
					array 进入动画开始结束帧 [start, end]
					array 轮询动画开始结束帧 [start, end]
					array 动画部分尺寸 [width,height]
					array 动画部分定位 [x,y]
					string 文字图片地址
					array 文字图片尺寸
				}
			]
		}
	*/
	//全局变量
	var cfg = cfg,
		cvs = document.getElementById(cfg.warpId),
		maskCtx = null,
		outerWidth = Math.max(window.innerWidth, document.body.offsetWidth),
		outerHeight = Math.max(window.innerHeight, document.body.offsetHeight),
		Page = [],
		curPage = 0,//当前所在的页面
		tmpText,
		tmpImg,
		tmpImg2,
		fps = cfg.fps;

	//工具-处理滑动事件
	var _scroll = {
		moving: false,
		bind: function () {
            for (var i = 0, len = events.length; i<len; i++) {
                cvs.addEventListener(events[i], this);
            }
            cvs.ondragstart = function() { return false; };
        },
        unbind: function () {
            for (var i = 0, len = events.length; i<len; i++) {
                cvs.removeEventListener(events[i], this);
            }
            cvs.ondragstart = null;
        },
	    onStart: function (evt) {
            var touch = evt.touches? evt.touches[0] : evt;
            this.startY = touch.clientY;
        },
        onMove: function (evt) {
   			var touch = evt.touches? evt.touches[0] : evt;
            this.endY = touch.clientY;
        },
        onEnd: function (evt) {
        	if(!this.moving) {
        		this.moving = true;
	            if(this.endY > this.startY + 20) {
	            	_app.playNext(1);
	            } else if(this.endY < this.startY - 20) {
	            	_app.playNext(0);
	            }
            }
        },
		//由此对象代理事件
		handleEvent: function (evt) { //to do
            switch (evt.type) {
                case 'mouseover':
                case 'mousedown':
                case 'touchstart':
                    this.onStart(evt);
                    break;

                case 'mousemove':
                case 'touchmove':
                    this.onMove(evt);
                    break;

                case 'mouseout':
                case 'mouseup':
                case 'touchend':
                case 'touchcancel':
                    this.onEnd(evt);
                    break;
            }
        }
	};

	var _app = {
		timerPlay: 0,
		curPlay: 1,
		ratio: 1,
		textOffset: 0,
		isDrawText: false,
		init: function(cfg) {
			this.reset();
			maskCtx = maskCtx || cvs.getContext('2d');
			this.resizeCanvas();
			this.createPage();
			this.drawPage();
		},
		//重置画布
		resizeCanvas: function() {
			outerWidth = Math.max(window.innerWidth, document.body.offsetWidth);
			outerHeight = Math.max(window.innerHeight, document.body.offsetHeight);
            cvs.width = outerWidth;
            cvs.height = outerHeight;
            this.mainCvs = this._getMainPosition(cvs.width, cvs.height);
            this.ratio =  this.mainCvs[2] / cfg.desingWidth;
		},
		reset: function() {
            clearRequestTimeout(this.timerPlay);
			_scroll.moving = false;
			this.isDrawText = false;
			this.textOffset = 0;
			this.curPlay = 0;
			tmpText = null;
		},
		/*
			# 主要内容区域按照设计稿比例显示
			# param 当前屏幕宽度，当前屏幕高度
			# return [主区域x轴起点，主区域y轴起点，主区域宽度，主区域高度]
		*/
		_getMainPosition: function(w, h) {
			var ratio = cfg.desingWidth / cfg.desingHeight, x, y, _w, _h;
			if(w/h < ratio) {
				_w = w;
				_h = w / ratio;
				x = 0;
				y = Math.abs(_h - h) / 2;
			} else {
				_w = h * ratio;
				_h = h;
				x = Math.abs(_w - w) / 2;
				y = 0;
			}
			return [x, y, _w, _h];
		},
		/*
			# 根据配置文件创建页面对象
			# return 
			{
				string 背景图地址
				string 渲染类型 0平铺1拉伸
				array 进入动画开始结束帧 [start, end]
				array 轮询动画开始结束帧 [start, end]
				array 动画部分尺寸 [width,height]
				array 动画部分定位 [x,y]
				string 文字图片地址
			}
		*/
		createPage: function() {
			var tmp;
			for (var i = 0; i < cfg.pageNum; i++) {
				tmp = {
					backgroundimg: 'img/page' + (i + 1) + '/' + cfg.page[i].backgroundimg,
					backgroundtype: cfg.page[i].backgroundtype,
					entrance: cfg.page[i].entrance,
					play: cfg.page[i].play,
					size: cfg.page[i].size,
					position: cfg.page[i].position,
					word: cfg.page[i].word,
					wordSizeAndPosition: cfg.page[i].wordSizeAndPosition,
				};
				Page.push(tmp);
			}
		},
		//展示某一页
		drawPage: function(page) {
            curPage = page || curPage;
			this.drawBackground(Page[curPage].backgroundimg, Page[curPage].backgroundtype);
			this.play();
		},
		//绘制背景
		drawBackground: function(src, type) {
			var img = new Image();
			img.src = src;
			img.onload = function() {
				if(type === '1') {
					maskCtx.drawImage(img, 0, 0, cvs.width, cvs.height);
				} else if(type === '0') {
					var pat = maskCtx.createPattern(img, "repeat");
					maskCtx.rect(0, 0, cvs.width, cvs.height);
					maskCtx.fillStyle = pat;
					maskCtx.fill();
				}
			}
		},
		//中间的动画画图
		_drawImg: function() {
			var that = this, 
				img = new Image(), 
				tmp = this.curPlay < 10 ? '0' + this.curPlay : this.curPlay,
				page =  Page[curPage],
				size = [ this.ratio * page.size[0], this.ratio * page.size[1] ],
				position = [ this.ratio * page.position[0] + this.mainCvs[0], 
							this.ratio * page.position[1] + this.mainCvs[1] ];
			img.src = 'img/page' + (curPage + 1) + '/' + 'motion_00' + tmp + '.jpg';
			maskCtx.save();
			img.onload = function() {
				maskCtx.restore();
				maskCtx.drawImage(img, position[0], position[1], size[0], size[1]);
			}
		},
		drawText: function() {
			if(this.isDrawText) {
				return false;
			}
			this.isDrawText = true;
			var that = this,
				img = new Image(), 
				page = Page[curPage],
				sizeAndPosition = [
					this.ratio * page.wordSizeAndPosition[0],
					this.ratio * page.wordSizeAndPosition[1],
					this.ratio * page.wordSizeAndPosition[2] + this.mainCvs[0],
					this.ratio * page.wordSizeAndPosition[3] + this.mainCvs[1],
				];
			img.src = 'img/page' + (curPage + 1) + '/' +  page.word;
			img.onload = function() {
				//maskCtx.drawImage(img, sizeAndPosition[2], sizeAndPosition[3], sizeAndPosition[0], sizeAndPosition[1]);
				that.textImg = img;
				that.textSizeAndPosition = sizeAndPosition;
				that.playText();
			}
		},
		//文字进入动画，硬编码
		playText: function() {
			var tmpi = _app.textImg, tmps = _app.textSizeAndPosition;
			_app.timerTextPlay = requestTimeout(_app.playText, fps);
			if(tmpText){
				maskCtx.putImageData(tmpText, tmps[2], tmps[3] - cvs.height * 0.05);
			}
			tmpText = maskCtx.getImageData(tmps[2], tmps[3] - cvs.height * 0.05, tmps[0], tmps[1] + cvs.height * 0.05);
			maskCtx.save();
			maskCtx.globalAlpha = Math.floor(_app.textOffset/(cvs.height * 0.005)) / 10;
			maskCtx.translate(0, -_app.textOffset);
			maskCtx.drawImage(tmpi, tmps[2], tmps[3], tmps[0], tmps[1]);
			maskCtx.restore();
			_app.textOffset += cvs.height * 0.005;
			if(_app.textOffset > cvs.height * 0.05) {
				clearRequestTimeout(_app.timerTextPlay);
			}
		},
		//播放中间的动画
		play: function() {
			_app.curPlay++;
			if(_app.curPlay > Page[curPage].play[1]) {
				_app.curPlay = Page[curPage].play[0];
				_app.drawText();
			}
			_app._drawImg();
			_app.timerPlay = requestTimeout(_app.play, fps);
		},
		//两页之间的切换
		playNext: function(type) {
			var that = this;
			if(type === 0) {
				curPage++;
				if(curPage > Page.length - 1) {
					_scroll.moving = false;
					curPage = Page.length - 1;
					return;
				}
			} else if(type === 1) {
				curPage--;
				if(curPage < 0) {
					_scroll.moving = false;
					curPage = 0;
					return;
				}
			}
			var img = new Image();
			img.src = Page[curPage].backgroundimg;
			img.onload = function() {
				clearRequestTimeout(that.timerPlay);
				clearRequestTimeout(that.timerTextPlay);
				tmpImg = maskCtx.getImageData(0, 0, cvs.width, cvs.height);
				tmpImg2 = img;
				that.playBetweenType = type;
				that.playBetweenCur = 0;
				that.playBetween();
			}
		},
		playBetween: function() {
			var move = cvs.height * 0.075;
			maskCtx.save();
			maskCtx.putImageData(tmpImg, 0, -_app.playBetweenCur);
			if(_app.playBetweenType === 0) {
				maskCtx.drawImage(tmpImg2, 0, cvs.height - _app.playBetweenCur, cvs.width, cvs.height);
				_app.playBetweenCur += move;
			} else if(_app.playBetweenType === 1) {
				maskCtx.drawImage(tmpImg2, 0, - cvs.height - _app.playBetweenCur, cvs.width, cvs.height);
				_app.playBetweenCur -= move;
			}
			maskCtx.restore();
			_app.timerPlayBetween = requestTimeout(_app.playBetween, fps);
			if(Math.abs(_app.playBetweenCur) >= cvs.height) {
				clearRequestTimeout(_app.timerPlayBetween);
				_scroll.moving = false;
				_app.reset();
				_app.drawPage();
			}
		}
	};
	var app = {
		init: function() {
			_app.init();
			_scroll.bind();
		},
        drawPage: function(page) {
            _scroll.moving = false;
            _app.reset();
            _app.drawPage(page);
        },
        destory : function() {
            if(!_app) {return;}
            clearRequestTimeout(_app.timerPlay);
            clearRequestTimeout(_app.timerTextPlay);
            clearRequestTimeout(_app.timerPlayBetween);
            _scroll.unbind();
            _scroll = null;
            _app = null;
        }//,self: _app
	};
	window.onresize = function() {
		app.init();
	};
	app.init();
	return app;
};

(function(){
    'use strict';
    var path = require('path'),
        template = require('art-template'),
        tepl = $('#tepl')[0].innerText,
        fs = require('fs');
    var testApp;
    var config = {};
    var node = {
        _fileUpload : function(files, nth) {
            var fName = config.src + '/img/page' + (Number(nth) + 1) + '/' + path.basename(files[0].name);
            var buffer = fs.readFileSync(files[0].path);
            //console.log(config.src + '/img/page' + (Number(nth) + 1) + '/' + fName)
            fs.writeFileSync(fName, buffer);
            return fName;
        }
    };
    var fe = {

    };
    Array.prototype.baoremove = function(dx) {
        if(isNaN(dx)||dx>this.length){return false;}
        this.splice(dx,1);
    };
    fe.preview = function() {
        var prevWindow = $('#preview')[0].contentWindow;
        if(!prevWindow) {return;}
        if(testApp) {
            testApp.destory();
            testApp = null;
        }
        testApp = new prevWindow.App(config);
        //var app = new App(config);
    };

    fe.openProject = function(src) {
        if(!fs.existsSync(src + '/config.json')) {
            alert('请选择正确的路径');
        } else {
            try{
                config = JSON.parse(fs.readFileSync(src + '/config.json', {encoding:'utf8'}).toString());
                config.src = src;
                this.buildDom();
                this.bindEvent();
                $('#preview')[0].src = src + '/index.html';
                $('#preview')[0].onload = function() {
                    fe.preview();
                }
            } catch (e) {
                alert('配置文件非法');
            }
        }
    };
    fe.buildDom = function() {
        var render = template.compile(tepl);
        $('.start').hide();
        $('.row-fluid').html(render(config)).show();
    };
    fe.updateConfig = function() {
        config.pageNum = $('#pageNum').val();
        config.audioSrc = $('#audioSrc').val();
        config.desingWidth = $('#desingWidth').val();
        config.desingHeight = $('#desingHeight').val();
        config.fps = $('#fps').val();
        for(var i = 0; i < config.page.length; i++) {
            config.page[i].backgroundtype = Number($("input[name='bgtype_"+i+"']:checked").val());
            config.page[i].backgroundimg = config.page[i].backgroundtype !== -1 ? path.basename($('#backgroundimg'+i)[0].src) : $('#colorValue' + i).val();
            config.page[i].play[0] = Number($('#playStart' + i).val());
            config.page[i].position= [Number($('#positionStart' + i).val()), Number($('#positionEnd' + i).val())];
            config.page[i].size= [Number($('#size0' + i).val()), Number($('#size1' + i).val())];
            config.page[i].word= path.basename($('#wordsrc'+i)[0].src);
            config.page[i].wordSizeAndPosition = [
                Number($('#wordSize0'+i).val()),
                Number($('#wordSize1'+i).val()),
                Number($('#wordSize2'+i).val()),
                Number($('#wordSize3'+i).val())
            ];
        }
        console.log(config)
    };
    fe.bindEvent = function() {
        $('input').bind('change', function() {
            fe.updateConfig();
            fe.preview();
            //openProject(this.value);
        });
        $('.nav-tabs li').bind('click', function() {
            $('.nav-tabs li').removeClass('active');
            $(this).addClass('active');
            $('.inner-box .item').hide();
            $('.inner-box .item').eq($(this).attr('data-nth')).show();
            config.startPage = Number($(this).attr('data-nth'));
            fe.updateConfig();
            fe.preview();
        });
        $('.evt-bgtype input').change(function() {
            if($(this).val() === '-1') {
                $('.evt-bgtype-img').hide();
                $('.evt-bgtype-color').show();
            } else {
                $('.evt-bgtype-color').hide();
                $('.evt-bgtype-img').show();
            }
        });
        $('.evt-uploadbg').change(function() {
            var nth = $(this).attr('data-nth');
            var nf = node._fileUpload(this.files, nth);
            config.page[nth].backgroundimg = path.basename(nf);
            fe.preview();
            $('#backgroundimg'+nth)[0].src = nf;
        });
        $('.evt-uploadword').change(function() {
            var nth = $(this).attr('data-nth');
            var nf = node._fileUpload(this.files, nth);
            config.page[nth].word = path.basename(nf);
            fe.preview();
            $('#wordsrc'+nth)[0].src = nf;
        });
        $('.evt-uploadplay').change(function() {
            var nth = $(this).attr('data-nth');
            var nf = node._fileUpload(this.files, nth);
            var playMax = Number(config.page[nth].play[1]) + 1;
            playMax = playMax < 10 ? '000' + playMax : (playMax < 100 ? ('00' + playMax) : ('0' + playMax) );
            var newPath = path.dirname(nf) + '/motion_' + playMax + path.extname(nf);
            fs.rename(nf, newPath, function(err) {
                $('.animate' + nth +' ul').append(
            '<li>'+
                '<p><img src="'+newPath+'"/></p>'+
                '<p class="opt">'+
                '<i class="icon-arrow-left"></i>'+
                '<i class="icon-minus-sign"></i>'+
                '<i class="icon-arrow-right"></i>'+
                '</p>'+
                '<p class="ntn-num">第<span>'+ playMax +'</span>帧</p>'+
            '</li>'
                );
                config.page[nth].play[1] = playMax;
                fe.preview();
            });
        });


        $('#pageNum').bind('change', function() {
            var val = $(this).val();
            if(val > config.page.length) {
                fe.createPage(val);
            } else {
                for(var i = val; i < config.page.length; i++) {
                    config.page.baoremove(i);
                }
            }
            config.startPage = (Number(val)-1);
            fe.buildDom();
            fe.bindEvent();
            $('#preview')[0].src = config.src + '/index.html';
            $('#preview')[0].onload = function() {
                fe.preview();
            }
        });
    };
    fe.createPage = function(val) {
        for(var i = config.page.length; i < val; i++) {
            config.page.push({
                "backgroundimg": i % 2 === 0 ? "#000000" : "#ffffff",
                "backgroundtype": -1,
                "play": [0, 0],
                "position": [120, 170],
                "size": [401, 443],
                "word": "words.png",
                "wordSizeAndPosition": [453, 308, 90, 730]
            });
            mkdirsSync(config.src + '/img/page' + i);
        }
    };
    $(document).ready(function() {
        $('#filePathDialog').bind('click', function() {
            //openProject(this.value);
            var testsrc = process.cwd() + '/test'
            fe.openProject(testsrc);
        });
        /*test code*/
        //var testsrc = process.cwd() + '/test'
        //fe.openProject(testsrc);
    });


//创建多层文件夹 同步
    function mkdirsSync(dirpath, mode) {
        if (!fs.existsSync(dirpath)) {
            var pathtmp;
            dirpath.split(path.sep).forEach(function(dirname) {
                if (pathtmp) {
                    pathtmp = path.join(pathtmp, dirname);
                }
                else {
                    pathtmp = dirname;
                }
                if (!fs.existsSync(pathtmp)) {
                    if (!fs.mkdirSync(pathtmp, mode)) {
                        return false;
                    }
                }
            });
        }
        return true;
    }
})();
//preview();
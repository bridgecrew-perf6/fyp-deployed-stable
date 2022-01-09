/**
*  Sample.js
*
*  You can modify and use this source freely
*  only for the development of application related Live2D.
*
*  (c) Live2D Inc. All rights reserved.
*/

//import sth from faceMesh

// JavaScriptで発生したエラーを取得
window.onerror = function(msg, url, line, col, error) {
    var errmsg = "file:" + url + "<br>line:" + line + " " + msg;
    Simple.myerror(errmsg);
}

var Simple = function() {

    /*
    * Live2Dモデルのインスタンス
    */
    this.live2DModel = null;

    /*
    * アニメーションを停止するためのID
    */
    this.requestID = null;

    /*
    * モデルのロードが完了したら true
    */
    this.loadLive2DCompleted = false;

    /*
    * モデルの初期化が完了したら true
    */
    this.initLive2DCompleted = false;

    /*
    * WebGL Image型オブジェクトの配列
    */
    this.loadedImages = [];

    /*
    * Live2D モデル設定。
    */

    // Epsilon 2.1モデル
    // this.modelDef = {
    //     "type":"Live2D Model Setting",
    //     "name":"Epsilon2.1",
    //     "model":"assets/Epsilon2.1/Epsilon2.1.moc",
    //     "textures":[
    //         "assets/Epsilon2.1/Epsilon2.1.2048/texture_00.png",
    //     ]
    // };

    // haru2.0モデル
    this.modelDef = {
        "type":"Live2D Model Setting",
        "name":"haru",
        "model":"assets/haru/haru.moc",
        "textures":[
            "assets/haru/haru.1024/texture_00.png",
            "assets/haru/haru.1024/texture_01.png",
            "assets/haru/haru.1024/texture_02.png"
        ]
    };
    // izumi モデル
    // this.modelDef = {
    //     "type":"Live2D Model Setting",
    //     "name":"izumi",
    //     "model":"assets/izumi/izumi_suisai.moc",
    //     "textures":[
    //         "assets/izumi/izumi.1024/texture_00.png",
    //         "assets/izumi/izumi.1024/texture_01.png",
    //         "assets/izumi/izumi.1024/texture_02.png",
    //         "assets/izumi/izumi.1024/texture_03.png"
    //     ]
    // };
    // dragon model
    // this.modelDef = {
    //     "type":"Live2D Model Setting",
    //     "name":"dragon",
    //     "model":"assets/dragon/dragon.moc",
    //     "textures":[
    //         "assets/dragon/dragon.1024/texture_00.png",
    //         "assets/dragon/dragon.1024/texture_01.png",
    //         "assets/dragon/dragon.1024/texture_02.png",
    //         "assets/dragon/dragon.1024/texture_03.png",
    //         "assets/dragon/dragon.1024/texture_04.png"
    //     ]
    // };

    // Live2Dの初期化
    Live2D.init();

    // canvasオブジェクトを取得
    var canvas = document.getElementById("glcanvas");

    // コンテキストを失ったとき
    canvas.addEventListener("webglcontextlost", function(e) {
        Simple.myerror("context lost");
        loadLive2DCompleted = false;
        initLive2DCompleted = false;

        var cancelAnimationFrame =
            window.cancelAnimationFrame ||
            window.mozCancelAnimationFrame;
        cancelAnimationFrame(requestID); //アニメーションを停止

        e.preventDefault();
    }, false);

    // コンテキストが復元されたとき
    canvas.addEventListener("webglcontextrestored" , function(e){
        Simple.myerror("webglcontext restored");
        Simple.initLoop(canvas);
    }, false);

    // Init and start Loop
    Simple.initLoop(canvas);
};


/*
* WebGLコンテキストを取得・初期化。
* Live2Dの初期化、描画ループを開始。
*/
Simple.initLoop = function(canvas/*HTML5 canvasオブジェクト*/)
{
    //------------ WebGLの初期化 ------------

    // WebGLのコンテキストを取得する
    var para = {
        premultipliedAlpha : true,
//        alpha : false
    };
    var gl = Simple.getWebGLContext(canvas, para);
    if (!gl) {
        Simple.myerror("Failed to create WebGL context.");
        return;
    }

    // OpenGLのコンテキストをセット
    Live2D.setGL(gl);

    //------------ Live2Dの初期化 ------------

    // mocファイルからLive2Dモデルのインスタンスを生成
    Simple.loadBytes(modelDef.model, function(buf){
        live2DModel = Live2DModelWebGL.loadModel(buf);
    });

    // テクスチャの読み込み
    var loadCount = 0;
    for(var i = 0; i < modelDef.textures.length; i++){
        (function ( tno ){// 即時関数で i の値を tno に固定する（onerror用)
            loadedImages[tno] = new Image();
            loadedImages[tno].src = modelDef.textures[tno];
            loadedImages[tno].onload = function(){
                if((++loadCount) == modelDef.textures.length) {
                    loadLive2DCompleted = true;//全て読み終わった
                }
            }
            loadedImages[tno].onerror = function() {
                Simple.myerror("Failed to load image : " + modelDef.textures[tno]);
            }
        })( i );
    }

    //------------ 描画ループ ------------

    (function tick() {
        Simple.draw(gl); // 1回分描画

        var requestAnimationFrame =
            window.requestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.msRequestAnimationFrame;
            requestID = requestAnimationFrame( tick , canvas );// 一定時間後に自身を呼び出す
    })();
};


Simple.draw = function(gl/*WebGLコンテキスト*/)
{
    // 描画エリアをクリア
    gl.clearColor( 0.0 , 0.0 , 0.0 , 0.0 );
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Live2D初期化
    if( ! live2DModel || ! loadLive2DCompleted )
        return; //ロードが完了していないので何もしないで返る

    // ロード完了後に初回のみ初期化する
    if( ! initLive2DCompleted ){
        initLive2DCompleted = true;

        // 画像からWebGLテクスチャを生成し、モデルに登録
        for( var i = 0; i < loadedImages.length; i++ ){
            //Image型オブジェクトからテクスチャを生成
            var texName = Simple.createTexture(gl, loadedImages[i]);

            live2DModel.setTexture(i, texName); //モデルにテクスチャをセット
        }

        // テクスチャの元画像の参照をクリア
        loadedImages = null;

        // 表示位置を指定するための行列を定義する
        var s = 3.0 / live2DModel.getCanvasWidth(); //canvasの横幅を-1..1区間に収める
        var matrix4x4 = [
            s, 0, 0, 0,
            0,-s, 0, 0,
            0, 0, 1, 0,
           -1.5, 1, 0, 1
        ];
        live2DModel.setMatrix(matrix4x4);
    }

    // キャラクターのパラメータを適当に更新
    var t = UtSystem.getUserTimeMSec() * 0.001 * 2 * Math.PI; //1秒ごとに2π(1周期)増える
    var cycle = 3.0; //パラメータが一周する時間(秒)
    var cycleEyeBall = 0.1
    var cycleHead = 0.5
    // head
    // PARAM_ANGLE_Xのパラメータが[cycle]秒ごとに-30から30まで変化する
    // -30から30の値を加える
    if (headX){
        live2DModel.setParamFloat("PARAM_ANGLE_X", headX, 0.1);
    }
    else{
        live2DModel.setParamFloat("PARAM_ANGLE_X", 0, 1);
    }
    if (headY){
        live2DModel.setParamFloat("PARAM_ANGLE_Y", headY, 1);
    }
    else{
        live2DModel.setParamFloat("PARAM_ANGLE_Y", 0, 1);
    }
    if (headZ){
        live2DModel.setParamFloat("PARAM_ANGLE_Z", headZ, 1);
    } else{
        live2DModel.setParamFloat("PARAM_ANGLE_Z", 0, 1);
    }
    // eyes: 0~1
    if (leftEyeOpenRatio){
        live2DModel.setParamFloat("PARAM_EYE_R_OPEN", leftEyeOpenRatio);
    }
    else{
        live2DModel.setParamFloat("PARAM_EYE_R_OPEN", 1);
    }
    if (rightEyeOpenRatio){
        live2DModel.setParamFloat("PARAM_EYE_L_OPEN", rightEyeOpenRatio);
    }
    else{
        live2DModel.setParamFloat("PARAM_EYE_L_OPEN", 1);
    }
    // eyeball: ドラッグによる目の向きの調整, -1から1の値を加える
    if (eyeDirX){
        live2DModel.setParamFloat("PARAM_EYE_BALL_X", eyeDirX, 1);
    }else{
        live2DModel.setParamFloat("PARAM_EYE_BALL_X", -1, 1);
    }
    live2DModel.setParamFloat("PARAM_EYE_BALL_Y", 1, 1);
    // mouth: 0~1
    if (mouthOpen){
        live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", mouthOpen); //lipSyncValue
    } else {
        live2DModel.setParamFloat("PARAM_MOUTH_OPEN_Y", 0); //lipSyncValue
    }
    // smile or not: -1sad mouth, 1happy mouth
    if (mouthForm){
        live2DModel.setParamFloat("PARAM_MOUTH_FORM", mouthForm, 1);
    } else {
        live2DModel.setParamFloat("PARAM_MOUTH_FORM", 1, 1);
    }
    // body rotation: -10から10の値を加える
    if (headX){
        live2DModel.setParamFloat("PARAM_BODY_ANGLE_X", headX/6, 0.3); 
    } else {
        live2DModel.setParamFloat("PARAM_BODY_ANGLE_X", 0, 0.3); 
    }
    if (headZ){
        live2DModel.setParamFloat("PARAM_BODY_ANGLE_Z", headZ/3, 0.3); 
    } else {
        live2DModel.setParamFloat("PARAM_BODY_ANGLE_Z", 0, 0.1); 
    }
    // hair: -1~1
    if (headX){
        live2DModel.setParamFloat("PARAM_HAIR_FRONT", headX/30, 1);
        live2DModel.setParamFloat("PARAM_HAIR_BACK", headX/30, 1);
        live2DModel.setParamFloat("PARAM_HAIR_SIDE", headX/30, 1);
    }
    // // browse: -1~1
    // live2DModel.setParamFloat("PARAM_BROW_L_ANGLE", 1 * Math.cos(t/cycle), 1);
    // live2DModel.setParamFloat("PARAM_BROW_R_ANGLE", 1 * Math.cos(t/cycle), 1);
    // // curvature of browse
    // live2DModel.setParamFloat("PARAM_BROW_R_FORM", -1*Math.cos(t/cycle), 1);
    // live2DModel.setParamFloat("PARAM_BROW_L_FORM", -1*Math.cos(t/cycle), 1);
    // // y-coor of browse
    // live2DModel.setParamFloat("PARAM_BROW_L_Y", -1*Math.cos(t/cycle), 1);
    // live2DModel.setParamFloat("PARAM_BROW_R_Y", -1*Math.cos(t/cycle), 1);
    
    //..................later work.......................//
    // perhaps other model sin have
    live2DModel.setParamFloat("PARAM_EYE_L_SMILE", -1*Math.cos(t/cycle), 1);
    // breath: -1~1?
    live2DModel.setParamFloat("PARAM_BREATH", 1*Math.cos(t/cycle), 1);

    
    // Live2Dモデルを更新して描画
    live2DModel.update(); // 現在のパラメータに合わせて頂点等を計算
    live2DModel.draw();   // 描画
};


/*
* WebGLのコンテキストを取得する
*/
Simple.getWebGLContext = function(canvas/*HTML5 canvasオブジェクト*/)
{
    var NAMES = [ "webgl" , "experimental-webgl" , "webkit-3d" , "moz-webgl"];

    var param = {
        alpha : true,
        premultipliedAlpha : true
    };

    for( var i = 0; i < NAMES.length; i++ ){
        try{
            var ctx = canvas.getContext( NAMES[i], param );
            if( ctx ) return ctx;
        }
        catch(e){}
    }
    return null;
};


/*
* Image型オブジェクトからテクスチャを生成
*/
Simple.createTexture = function(gl/*WebGLコンテキスト*/, image/*WebGL Image*/)
{
    var texture = gl.createTexture(); //テクスチャオブジェクトを作成する
    if ( !texture ){
        mylog("Failed to generate gl texture name.");
        return -1;
    }

    if(live2DModel.isPremultipliedAlpha() == false){
        // 乗算済アルファテクスチャ以外の場合
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
    }
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);	//imageを上下反転
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D , texture );
    gl.texImage2D( gl.TEXTURE_2D , 0 , gl.RGBA , gl.RGBA , gl.UNSIGNED_BYTE , image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.bindTexture( gl.TEXTURE_2D , null );

    return texture;
};


/*
* ファイルをバイト配列としてロードする
*/
Simple.loadBytes = function(path , callback)
{
    var request = new XMLHttpRequest();
    request.open("GET", path , true);
    request.responseType = "arraybuffer";
    request.onload = function(){
        switch( request.status ){
        case 200:
            callback( request.response );
            break;
        default:
            Simple.myerror( "Failed to load (" + request.status + ") : " + path );
            break;
        }
    }

    request.send(null);
};


/*
* 画面ログを出力
*/
Simple.mylog = function(msg/*string*/)
{
    var myconsole = document.getElementById("myconsole");
    myconsole.innerHTML = myconsole.innerHTML + "<br>" + msg;
    console.log(msg);
};

/*
* 画面エラーを出力
*/
Simple.myerror = function(msg/*string*/)
{
    console.error(msg);
    Simple.mylog( "<span style='color:red'>" + msg + "</span>");
};
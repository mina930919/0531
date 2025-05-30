let video;
let poseNet;
let pose;
let handpose;
let hands = [];

// 用來儲存從雙眼發射出去的愛心
let heartsR = [];
let heartsL = [];
let heartColor;
let triggerRight = false;
let triggerLeft = false;
let triggerThreshold = 30; // px

// 新增：能量波資料
let mouthWaves = [];

// 新增：耳朵聲波資料
let earWavesL = [];
let earWavesR = [];

// 新增：鼻子氣流資料
let noseFlows = [];
let noseFlowActive = false;

function preload() {
  // 無需載入耳朵圖片
}

function setup() {
  createCanvas(640, 480);
  video = createCapture(VIDEO);
  video.hide();
  poseNet = ml5.poseNet(video, modelLoaded);
  poseNet.on('pose', gotPoses);

  // handpose 初始化
  handpose = ml5.handpose(video, () => {
    console.log('handpose ready');
  });
  handpose.on('predict', gotHands);

  heartColor = color(255, 150, 200); // 粉紅色
}

function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
  }
}

function gotHands(results) {
  hands = results;
}

function modelLoaded() {
  console.log('poseNet ready');
}

function draw() {
  background(0);
  translate(video.width, 0);
  scale(-1, 1);
  image(video, 0, 0);

  triggerRight = false;
  triggerLeft = false;

  // 檢查 handpose 是否偵測到右手食指尖
  let triggerBoth = false;
  let triggerEarL = false;
  let triggerEarR = false;
  let triggerNose = false;

  // 取得耳朵與鼻子位置（keypoints 3: 左耳, 4: 右耳, 0: 鼻子）
  let earL = null, earR = null, nose = null;
  if (pose && pose.keypoints) {
    if (pose.keypoints[3] && pose.keypoints[3].score > 0.3) {
      earL = pose.keypoints[3].position; // 左耳
    }
    if (pose.keypoints[4] && pose.keypoints[4].score > 0.3) {
      earR = pose.keypoints[4].position; // 右耳
    }
    if (pose.keypoints[0] && pose.keypoints[0].score > 0.3) {
      nose = pose.keypoints[0].position; // 鼻子
    }
  }

  if (hands.length > 0 && pose) {
    for (let hand of hands) {
      if (hand.landmarks && hand.landmarks.length > 8) {
        let indexTip = hand.landmarks[8];
        let ix = width - indexTip[0];
        let iy = indexTip[1];
        let dR = dist(ix, iy, pose.rightEye.x, pose.rightEye.y);
        let dL = dist(ix, iy, pose.leftEye.x, pose.leftEye.y);
        if (dR < triggerThreshold || dL < triggerThreshold) {
          triggerBoth = true;
        }
        // 檢查靠近耳朵
        if (earL && dist(ix, iy, earL.x, earL.y) < triggerThreshold) {
          triggerEarL = true;
        }
        if (earR && dist(ix, iy, earR.x, earR.y) < triggerThreshold) {
          triggerEarR = true;
        }
        // 檢查右手食指靠近鼻子
        // 右手在畫面左半邊
        if (ix < width / 2 && nose && dist(ix, iy, nose.x, nose.y) < triggerThreshold) {
          triggerNose = true;
        }
      }
    }
  }

  // 兩眼同時發射愛心（只有觸發時才發射）
  if (pose && triggerBoth && frameCount % 8 === 0) {
    let eyeR = pose.rightEye;
    let eyeL = pose.leftEye;
    heartsR.push({
      x: eyeR.x,
      y: eyeR.y,
      size: random(18, 28),
      vx: random(-0.1, 0.1),
      vy: random(2, 3),
      alpha: 255
    });
    heartsL.push({
      x: eyeL.x,
      y: eyeL.y,
      size: random(18, 28),
      vx: random(-0.1, 0.1),
      vy: random(2, 3),
      alpha: 255
    });
  }

  // ====== 只要有手指靠近任一耳朵，兩耳都產生聲波圓圈（連續一圈圈）======
  let earTriggered = (triggerEarL && earL) || (triggerEarR && earR);
  if (earTriggered) {
    if (earL && frameCount % 6 === 0) {
      earWavesL.push({
        x: earL.x,
        y: earL.y,
        r: 10,
        alpha: 180
      });
    }
    if (earR && frameCount % 6 === 0) {
      earWavesR.push({
        x: earR.x,
        y: earR.y,
        r: 10,
        alpha: 180
      });
    }
  }

  // 畫出耳朵聲波圓圈（左耳）
  for (let i = earWavesL.length - 1; i >= 0; i--) {
    let w = earWavesL[i];
    noFill();
    stroke(0, 255, 180, w.alpha);
    strokeWeight(4);
    ellipse(w.x, w.y, w.r * 2);
    w.r += 3;        // 讓圓形逐漸變大
    w.alpha -= 3;    // 讓圓形逐漸淡出
    if (w.alpha <= 0) {
      earWavesL.splice(i, 1);
    }
  }
  // 畫出耳朵聲波圓圈（右耳）
  for (let i = earWavesR.length - 1; i >= 0; i--) {
    let w = earWavesR[i];
    noFill();
    stroke(0, 255, 180, w.alpha);
    strokeWeight(4);
    ellipse(w.x, w.y, w.r * 2);
    w.r += 3;
    w.alpha -= 3;
    if (w.alpha <= 0) {
      earWavesR.splice(i, 1);
    }
  }

  // 更新與繪製右眼愛心
  for (let i = heartsR.length - 1; i >= 0; i--) {
    let h = heartsR[i];
    drawHeart(h.x, h.y, h.size, color(255, 150, 200, h.alpha));
    h.x += h.vx;
    h.y += h.vy;
    h.alpha -= 3;
    if (h.alpha <= 0) {
      heartsR.splice(i, 1);
    }
  }
  // 更新與繪製左眼愛心
  for (let i = heartsL.length - 1; i >= 0; i--) {
    let h = heartsL[i];
    drawHeart(h.x, h.y, h.size, color(255, 150, 200, h.alpha));
    h.x += h.vx;
    h.y += h.vy;
    h.alpha -= 3;
    if (h.alpha <= 0) {
      heartsL.splice(i, 1);
    }
  }

  // ====== 鼻子氣流特效（小波浪且略帶弧線、上下漂浮）======
  if (triggerNose && nose) {
    noseFlowActive = true;
    // 若沒有氣流就初始化數條氣流
    if (noseFlows.length === 0) {
      for (let i = 0; i < 5; i++) {
        noseFlows.push({
          offsetX: random(-10, 10),
          offsetY: random(12, 18),
          noiseSeed: random(1000),
          color: color(180, 220, 255, 120)
        });
      }
    }
  } else {
    noseFlowActive = false;
    noseFlows = [];
  }

  // 畫出鼻子氣流動態曲線（略帶弧線且上下漂浮）
  if (noseFlowActive && nose) {
    for (let i = 0; i < noseFlows.length; i++) {
      let flow = noseFlows[i];
      stroke(flow.color);
      strokeWeight(2.5);
      noFill();
      beginShape();
      for (let t = 0; t < 1; t += 0.04) {
        // 曲線起點在鼻子下方
        let baseX = nose.x + flow.offsetX;
        let baseY = nose.y + flow.offsetY;
        // 弧線：讓 x 隨 t^2 微彎，y 隨 t 增加
        // 小波浪：x/y 疊加高頻小幅正弦
        // 上下漂浮：疊加一個隨 frameCount 變動的正弦
        let arcX = baseX + 18 * t * t - 9 * t; // 弧線主體
        let waveX = 8 * sin(TWO_PI * t * 6 + i * 0.7 + frameCount * 0.09 + flow.noiseSeed);
        let floatY = 6 * sin(frameCount * 0.07 + i); // 上下漂浮
        let y = baseY + t * 60 + 4 * sin(TWO_PI * t * 8 + i + frameCount * 0.12 + flow.noiseSeed) + floatY;
        let x = arcX + waveX;
        vertex(x, y);
      }
      endShape();
    }
  }
}

// 畫愛心
function drawHeart(x, y, size, c) {
  push();
  translate(x, y);
  fill(c);
  noStroke();
  beginShape();
  vertex(0, 0);
  bezierVertex(-size/2, -size/2, -size, size/3, 0, size);
  bezierVertex(size, size/3, size/2, -size/2, 0, 0);
  endShape(CLOSE);
  pop();
}
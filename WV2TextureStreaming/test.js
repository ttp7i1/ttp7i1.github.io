

function log(msg) {
    console.log(`${new Date()} ${msg}`)
}

let startTime;
const selectedEffect = document.getElementById('effectId');
const startWebCam = document.getElementById('startWebCam');
const startSlimCore = document.getElementById('startSlimCore');
const localVideo = document.getElementById('localVideo');
const processedVideo = document.getElementById('processedVideo');

const app_empty = new Worker('app_empty.js', {name: 'Empty effect'});

async function startSlimCoreFn() {
    await run(true);
}
async function startWebCamFn() {
    await run(false);
}
async function run(isSlimCore) {
    log('enter');

    let streamId = "\\\\?\\usb#vid_17ef&pid_482f&mi_00#7&448cba6&0&0000#{65e8773d-8f56-11d0-a3b9-00a0c9223196}\\global";
    //streamId = "webview2-abcd1234";

    var stream;
    if (isSlimCore) {
        stream = await window.chrome.webview.getTextureStream(streamId)
    }
    else {
        const constraints = { video: true };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    }
    localVideo.srcObject  = stream;

    const [track] = stream.getTracks();
    const processor = new MediaStreamTrackProcessor({track});
    const {readable} = processor;

    const generator = new MediaStreamTrackGenerator({kind: 'video'});
    const {writable} = generator;
  
    app_empty.postMessage({
      operation: selectedEffect.value,
      readable,
      writable
    }, [readable, writable]);

    processedVideo.srcObject = new MediaStream([generator]);
    if (isSlimCore) {
        window.chrome.webview.registerTextureStream(streamId, generator);
    }

    log('exit');
}

function main() {
    startWebCam.addEventListener('click', startWebCamFn);
    startSlimCore.addEventListener('click', startSlimCoreFn);

    localVideo.addEventListener('loadedmetadata', function() {
        log(`Local video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
    });

    processedVideo.addEventListener('loadedmetadata', function() {
        log(`Processed video videoWidth: ${this.videoWidth}px,  videoHeight: ${this.videoHeight}px`);
    });
}

main();
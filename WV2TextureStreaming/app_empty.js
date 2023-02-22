'use strict';

let abortController = new AbortController();

function emptyTransform(frame, controller) {
    console.log(`frame: {frame.timestamp}`)
    controller.enqueue(frame);
}

let droppingTransform_data = {
    counter: 0
};
async function droppingTransform(frame, controller) {
    const drop = ++droppingTransform_data.counter%2 === 0;
    if (drop) {
        frame.close();
        return;
    }
    controller.enqueue(frame);
}

async function delayingTransform(frame, controller) {
    await new Promise(resolve => setTimeout(resolve, 100));
    controller.enqueue(frame);
}

let canvasTransform_data = {
    canvas: null,
    context: null,
    x: 0
};
async function canvasTransform(frame, controller) {
    if (!canvasTransform_data.canvas) {
        canvasTransform_data.canvas = new OffscreenCanvas(1,1);
        canvasTransform_data.context = canvasTransform_data.canvas.getContext('2d');
        if (!canvasTransform_data.context) throw new Error('init canvasTransform_data.context error');
    }

    let frame2 = frame;
    const width = frame2.displayWidth;
    const height = frame2.displayHeight;
    const ctx = canvasTransform_data.context;

    canvasTransform_data.canvas.width = width;
    canvasTransform_data.canvas.height = height;
    canvasTransform_data.canvas.height = height + 8;

    ctx.fillRect(0,0,width,height);

    const sy = 200;
    const dWidth = width;
    const dHeight = 200;

    // print bytes
    let copyNv12 = async (frame, top, height) => {
        const width = frame.displayWidth;
        let buffer = new Uint8Array(width*height*1.5);
        await frame.copyTo(buffer, {rect:{x:0,y:top,width:width,height:height}})
        return buffer;
    }
    let header = await copyNv12(frame, 0, 4);
    let metadata = await copyNv12(frame, 200, 4);
    ctx.font = "48px serif";
    ctx.fillStyle = 'red';
    ctx.fillText(header.subarray(0,6).toString(), 20, sy+dHeight-48, width);
    ctx.fillText(metadata.subarray(0,6).toString(), 20, sy+dHeight, width);

    ctx.translate(width, 0);
    ctx.scale(-1,1);
    ctx.drawImage(frame2, 0, sy, dWidth, dHeight, 0, 0, dWidth, dHeight);

    const timestamp = frame2.timestamp;
    frame.close();

    // ctx.shadowColor = '#FFFF00';
    // ctx.shadowBlur = 50;
    // ctx.lineWidth = 50;
    // ctx.strokeStyle = '#FFFF00';
    // ctx.strokeRect(0, 0, width, height);

    const canvas = canvasTransform_data.canvas;
    let imgData1 = ctx.getImageData(0, 0, canvas.width, 4);
    let imgData2 = ctx.getImageData(0, canvas.height-4, canvas.width, 4);

    imgData1.data[0] = 200;
    imgData1.data[4] = 201;
    imgData1.data[8] = 202;
    imgData1.data[12] = 203;
    ctx.putImageData(imgData1, 0,4+canvas.height);

    imgData2.data[0] = 200;
    imgData2.data[4] = 201;
    imgData2.data[8] = 202;
    imgData2.data[12] = 203;
    ctx.putImageData(imgData2, 0,4+canvas.height);

    // Animation
    let x = canvasTransform_data.x + 10;
    if (x>canvas.width-90) x = 0;
    ctx.fillRect(x, 100, 90, 50);
    canvasTransform_data.x = x;

    // alpha: 'discard' is needed in order to send frames to a PeerConnection.
    controller.enqueue(new VideoFrame(
        canvasTransform_data.canvas, 
        {timestamp: timestamp, alpha: 'discard'}));
}


onmessage = async (event) => {
    console.log(`app_empty ${JSON.stringify(event)}}`)
    const { operation } = event.data;

    let effect = emptyTransform;
    if (operation === 'Drop') {
        effect = droppingTransform;
    } else if (operation === 'Delay') {
        effect = delayingTransform;
    } else if (operation === 'Canvas') {
        effect = canvasTransform;
    }

    const { readable, writable } = event.data;
    const signal = abortController.sinal;
    const promise = readable
        .pipeThrough(new TransformStream({ transform: effect }), {signal})
        .pipeTo(writable);
    promise.catch((e) => {
        if (signal.aborted) {
            console.log("signal aborted");
        }
        else {
            console.log("signal error:" + e);
        }
        readable.cancel(e);
        writable.abort(e);
    })
};
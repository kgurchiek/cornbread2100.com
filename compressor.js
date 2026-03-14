import { FFmpeg } from './ffmpeg/ffmpeg/dist/esm/index.js';
import { fetchFile, toBlobURL } from './ffmpeg/util/dist/esm/index.js';
const ffmpeg = new FFmpeg();

const uploadLabel = document.getElementById('upload-label');
const uploadInput = document.getElementById('upload');
const resolutionDropdown = document.getElementById('set-resolution');
const fileNameInput = document.getElementById('file-name');
const compressButton = document.getElementById('compress-button');
const outputVideo = document.getElementById('output-video');
const downloadButton = document.getElementById('download-button');
const errorContainer = document.getElementById('error-container');

let errorQueue = [];
function error(message, header = 'Error', color = '#ff0000') {
    let error = document.createElement('div');
    error.classList.add('error', 'alert');
    error.style.setProperty('--color', color)
    error.innerHTML = `
            <button class="delete-error" onclick="this.parentElement.classList.add('remove')">
                <svg fill="currentColor">
                    <use href="#icon-x"></use>
                </svg>
            </button>
            <strong>${header}</strong>
            <br>
            <span class="message">${message}</span>
        `;
    error.addEventListener('animationend', (a) => {
        switch (a.animationName) {
            case 'alert': {
                error.classList.remove('alert');
                break;
            }
            case 'raise-alert': {
                error.classList.remove('raise');
                break;
            }
            case 'remove-alert': {
                error.remove();
                break;
            }
        }
    });
    errorQueue.push(error);
    return error;
}

setInterval(() => {
    if (errorQueue.length == 0) return;
    if (document.getElementsByClassName('error alert').length > 0 || document.getElementsByClassName('raise').length > 0) return;
    let error = errorQueue.splice(0, 1)[0];
    for (let element of errorContainer.children) element.classList.add('raise');
    errorContainer.appendChild(error);
    setTimeout(() => error.classList.add('remove'), 10000);
});

window.addEventListener('drop', (e) => {
    if ([...e.dataTransfer.items].some((item) => item.kind == 'file')) e.preventDefault();
});

window.addEventListener('dragover', (e) => {
    if ([...e.dataTransfer.items].some((item) => item.kind == 'file')) {
        e.preventDefault();
        if (!uploadLabel.contains(e.target)) e.dataTransfer.dropEffect = 'none';
    }
});

if (!isSecureContext) error('Insecure context, multithreading unavailable', 'Warning', '#ffdd00');
const baseURL = isSecureContext ? 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt/dist/esm' : 'https://cdn.jsdelivr.net/npm/@ffmpeg/core/dist/esm';
async function load() {
    if (ffmpeg.loaded) return;
    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
    });
}

const progressBar = document.getElementById('progress-bar');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressText = document.getElementById('progress-text');
let start;
ffmpeg.on('progress', ({ progress, time }) => {
    let speed = progress / (Date.now() - start) * 1000;
    let estimate = Math.min((1 - progress) / speed, 99 * 3600 + 59 * 60 + 59);
    let text = 'Estimated ';
    let hours = Math.floor(estimate / 3600);
    if (hours > 0) text += `${'0'.repeat(2 - String(hours).length)}${hours}:`;
    let minutes = Math.floor(estimate % 3600 / 60);
    if (hours > 0 || minutes > 0) text += `${'0'.repeat(2 - String(minutes).length)}${minutes}:`;
    let seconds = Math.floor(estimate % 60);
    text += `${hours == 0 && minutes == 0 ? `${seconds}s` : `${'0'.repeat(2 - String(seconds).length)}${seconds}`} remaining`;
    progressText.innerText = text;
    progressBarFill.style.width = `${(progress * 100).toFixed(1)}%`;
});

ffmpeg.on('log', ({ message }) => {
    console.log(message);
});

let file;
let format;
let resolutions = [
    { ratio: '21:9', resolution: '3440x1440' },
    { ratio: '21:9', resolution: '2560x1080' },
    { ratio: '17:9', resolution: '4096x2160' },
    { ratio: '17:9', resolution: '2048x1080' },
    { ratio: '16:9', resolution: '3840x2160' },
    { ratio: '16:9', resolution: '2560x1440' },
    { ratio: '16:9', resolution: '1920x1080' },
    { ratio: '16:9', resolution: '1600x900' },
    { ratio: '16:9', resolution: '1366x768' },
    { ratio: '16:9', resolution: '1280x720' },
    { ratio: '16:9', resolution: '1024x576' },
    { ratio: '16:9', resolution: '854x480' },
    { ratio: '5:3', resolution: '1280x768' },
    { ratio: '5:3', resolution: '800x480' },
    { ratio: '8:5', resolution: '2560x1600' },
    { ratio: '8:5', resolution: '1920x1200' },
    { ratio: '8:5', resolution: '1680x1050' },
    { ratio: '8:5', resolution: '1440x900' },
    { ratio: '8:5', resolution: '1280x800' },
    { ratio: '8:5', resolution: '320x200' },
    { ratio: '3:2', resolution: '1440x960' },
    { ratio: '3:2', resolution: '1280x854' },
    { ratio: '3:2', resolution: '1152x768' },
    { ratio: '3:2', resolution: '480x320' },
    { ratio: '4:3', resolution: '2048x1536' },
    { ratio: '4:3', resolution: '1600x1200' },
    { ratio: '4:3', resolution: '1440x1080' },
    { ratio: '4:3', resolution: '1400x1050' },
    { ratio: '4:3', resolution: '1280x960' },
    { ratio: '4:3', resolution: '1152x864' },
    { ratio: '4:3', resolution: '1024x768' },
    { ratio: '4:3', resolution: '800x600' },
    { ratio: '4:3', resolution: '768x576' },
    { ratio: '4:3', resolution: '640x480' },
    { ratio: '4:3', resolution: '384x288' },
    { ratio: '4:3', resolution: '320x240' },
    { ratio: '5:4', resolution: '2560x2048' },
    { ratio: '5:4', resolution: '1280x1024' }
].reverse();
async function processFile(f) {
    file = f;
    if (sizeMode == 'percentage') updatePercentageSlider();
    if (sizeMode == 'size') {
        updateSizeSlider();
        updateSizeText();
    }
    fileNameInput.value = `${file.name.slice(0, file.name.lastIndexOf('.'))}-compressed`;

    let dropdownButton = resolutionDropdown.getElementsByClassName('dropdown-button')[0];
    dropdownButton.classList.add('disabled');
    compressButton.classList.add('disabled');
    uploadLabel.children[1].innerHTML = `Uploaded: ${file.name}`;
    uploadLabel.classList.add('uploaded');

    await load();
    await ffmpeg.writeFile('input', await fetchFile(file));
    format = await probe('input');
    if (isNaN(format.format.duration) || isNaN(Number(format.format.duration))) error(`Invalid video duration: "${format.format.duration}"`, 'Error processing video');
    format.format.duration = Number(format.format.duration);
    let [num, den] = format.stream.r_frame_rate.split('/').map(a => parseInt(a));
    if (isNaN(num) || isNaN(den)) return error(`Error parsing frame rate: "${format.stream.r_frame_rate}"`);
    format.stream.r_frame_rate = num / den;
    frameRateSlider.max = Math.round(format.stream.r_frame_rate);
    let width = format.stream.width;
    let height = format.stream.height;
    if (isNaN(width) || isNaN(parseInt(width))) return error(`Invalid stream width: "${width}"`, 'Error processing video');
    if (isNaN(height) || isNaN(parseInt(height))) return error(`Invalid stream height: "${height}"`, 'Error processing video');
    width = parseInt(width);
    height = parseInt(height);
    let preset = resolutions.find(a => a.resolution == `${width}x${height}`) || { resolution: `${width}x${height}` };
    window.setResolution(preset.resolution.replaceAll(' ', '').replace('x', ':'), preset.resolution);
    resolutionDropdown.getElementsByClassName('dropdown-text')[0].innerText = `Resolution: ${preset.resolution}`;
    let dropdownContent = resolutionDropdown.getElementsByClassName('dropdown-content')[0];
    Array.from(dropdownContent.children).forEach(a => a.remove());
    for (let option of preset.ratio == null ? [preset] : resolutions.filter(a => a.ratio == preset.ratio)) {
        let [optionWidth, optionHeight] = option.resolution.split('x').map(a => parseInt(a.trim()));
        let element = document.createElement('a');
        element.onclick = () => window.setResolution(option.resolution.replaceAll(' ', '').replace('x', ':'), option.resolution);
        element.innerText = `${option.resolution} (${((optionWidth * optionHeight) / (width * height) * 100).toFixed(0)}%)`;
        dropdownContent.appendChild(element);
    }
    
    dropdownButton.classList.remove('disabled');
    compressButton.classList.remove('disabled');
}

uploadLabel.addEventListener('drop', (e) => {
    if (![...e.dataTransfer.items].some((item) => item.kind == 'file')) return;
    e.preventDefault();
    uploadLabel.classList.remove('drag');
    processFile(e.dataTransfer.files[0]);
});

uploadInput.addEventListener('change', () => {
    if (uploadInput.files.length == 0) return;
    processFile(uploadInput.files[0]);
});

uploadLabel.addEventListener('dragover', (e) => {
    if ([...e.dataTransfer.items].some((item) => item.kind == 'file')) e.dataTransfer.dropEffect = 'copy';
});

uploadLabel.addEventListener('dragenter', (e) => {
    if (e.target !== uploadLabel) return;
    uploadLabel.classList.add('drag');
});

uploadLabel.addEventListener('dragleave', (e) => {
    if (e.target !== uploadLabel) return;
    uploadLabel.classList.remove('drag');
});

window.toggleDropdown = (element, set) => {
    if (!set && element.classList.contains('disabled')) return;
    if (set == null) {
        element.parentElement.getElementsByClassName('dropdown-content')[0].classList.toggle('expanded');
        element.classList.toggle('expanded');
    } else if (set) {
        element.parentElement.getElementsByClassName('dropdown-content')[0].classList.add('expanded');
        element.classList.add('expanded');
    } else {
        element.parentElement.getElementsByClassName('dropdown-content')[0].classList.remove('expanded');
        element.classList.remove('expanded');
    }
}

window.toggleInlineDropdown = (element, set) => {
    if (!set && element.classList.contains('disabled')) return;
    if (set == null) {
        element.parentElement.getElementsByClassName('inline-dropdown-content')[0].classList.toggle('expanded');
        element.classList.toggle('expanded');
    } else if (set) {
        element.parentElement.getElementsByClassName('inline-dropdown-content')[0].classList.add('expanded');
        element.classList.add('expanded');
    } else {
        element.parentElement.getElementsByClassName('inline-dropdown-content')[0].classList.remove('expanded');
        element.classList.remove('expanded');
    }
}

for (let dropdown of document.getElementsByClassName('dropdown-container')) {
    let dropdownContent = dropdown.getElementsByClassName('dropdown-content')[0];
    dropdownContent.addEventListener('wheel', (e) => {
        if (e.deltaY > 0 && dropdownContent.scrollTop + dropdownContent.clientHeight >= dropdownContent.scrollHeight) e.preventDefault();
        if (e.deltaY < 0 && dropdownContent.scrollTop == 0) e.preventDefault();
    });

    function updateBottomFade() {
        if (!dropdownContent.classList.contains('expanded')) return;
        let isScrollable = dropdownContent.scrollHeight > dropdownContent.clientHeight;
        let hasContentBelow = (dropdownContent.scrollHeight - dropdownContent.clientHeight) - dropdownContent.scrollTop > 5;
        if (isScrollable && hasContentBelow) {
            dropdownContent.classList.add('fade-bottom');
        } else {
            dropdownContent.classList.remove('fade-bottom');
        }

        if (dropdownContent.scrollTop > 0) {
            dropdownContent.classList.add('fade-top');
        } else {
            dropdownContent.classList.remove('fade-top');
        }
    }
    dropdownContent.addEventListener('scroll', () => updateBottomFade());
    dropdownContent.addEventListener('transitionend', () => updateBottomFade());
}

let preset = 'ultrafast';
window.setPreset = (p, text) => {
    preset = p;
    document.getElementById('set-preset').getElementsByClassName('dropdown-text')[0].innerText = `Preset: ${text}`;
}

let resolution = '1920x1080';
window.setResolution = (r, text) => {
    resolution = r;
    document.getElementById('set-resolution').getElementsByClassName('dropdown-text')[0].innerText = `Resolution: ${text}`;
}

let sizeUnit = 1024*1024;
window.setSizeUnit = (u, text) => {
    sizeUnit = u;
    document.getElementById('set-size-unit').getElementsByClassName('dropdown-text')[0].innerText = text;
    window.toggleInlineDropdown(document.getElementById('set-size-unit').getElementsByClassName('inline-dropdown-button')[0]);
    updateSizeSlider();
}

let fileExtention = '.mp4';
window.setFileExtension = (e) => {
    fileExtention = e;
    document.getElementById('set-file-type').getElementsByClassName('dropdown-text')[0].innerText = e;
    window.toggleInlineDropdown(document.getElementById('set-file-type').getElementsByClassName('inline-dropdown-button')[0]);
}

let sizeMode = 'percentage';
let sizeTabs = [
    document.getElementById('percentage-tab'),
    document.getElementById('size-tab')
];
let sizeContents = [
    document.getElementById('percentage-content'),
    document.getElementById('size-content')
];
window.setSizeMode = (type) => {
    sizeTabs.forEach(a => a.classList.remove('selected-tab'));
    sizeContents.forEach(a => a.style.display = 'none');
    sizeMode = type;
    switch (type) {
        case 'percentage': {
            sizeTabs[0].classList.add('selected-tab');
            sizeContents[0].style.display = 'grid';
            updatePercentageSlider();
            break;
        }
        case 'size': {
            sizeTabs[1].classList.add('selected-tab');
            sizeContents[1].style.display = 'grid';
            updateSizeSlider();
            break;
        }
    }
}

let targetSize;
let percentageText = document.getElementById('percentage-text');
let percentageSlider = document.getElementById('percentage-slider');
function updatePercentageText() {
    percentageText.value = Number(percentageSlider.value).toFixed(0);
    if (file != null) targetSize = Math.round(percentageText.value / 100 * file.size);
}
function updatePercentageSlider() {
    percentageSlider.value = percentageText.value;
    if (file != null) targetSize = Math.round(percentageText.value / 100 * file.size);
}
updatePercentageSlider();
percentageSlider.addEventListener('input', updatePercentageText);
percentageText.addEventListener('input', updatePercentageSlider);

let sizeText = document.getElementById('size-text');
let sizeSlider = document.getElementById('size-slider');
function updateSizeText() {
    let size = file?.size || 100 * 1024 * 1024;
    sizeText.value = (sizeSlider.value / 100 * size / sizeUnit).toFixed(0);
    targetSize = Math.round(sizeText.value * sizeUnit);
}
sizeSlider.addEventListener('input', updateSizeText);
function updateSizeSlider() {
    let size = file?.size || 100 * 1024 * 1024;
    sizeSlider.value = (sizeText.value * sizeUnit) / size * 100;
    targetSize = Math.round(sizeText.value * sizeUnit);
}
updateSizeSlider();
sizeText.addEventListener('input', updateSizeSlider);

let frameRateText = document.getElementById('frame-rate-text');
let frameRateSlider = document.getElementById('frame-rate-slider');
function updateFrameRateText() {
    frameRateText.value = frameRateSlider.value;
}
frameRateSlider.addEventListener('input', updateFrameRateText);
function updateFrameRateSlider() {
    frameRateSlider.value = frameRateText.value;
}
updateSizeSlider();
frameRateText.addEventListener('input', updateFrameRateSlider);

async function probe(input) {
    await load();
    
    await ffmpeg.ffprobe([
        '-show_format',
        '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height,r_frame_rate',
        '-i', input,
        '-o', 'output.txt'
    ]);
    let output = new TextDecoder().decode(await ffmpeg.readFile('output.txt'));
    let streamString = output.slice(output.indexOf('[STREAM]') + 8, output.indexOf('[/STREAM]')).trim().split('\n');
    let formatString = output.slice(output.indexOf('[FORMAT]') + 8, output.indexOf('[/FORMAT]')).trim().split('\n');
    let data = { stream: {}, format: { tags: {} }};
    for (let line of streamString) {
        line = line.trim().split('=');
        data.stream[line[0]] = line[1];
    }
    for (let line of formatString) {
        line = line.trim().split('=');
        if (line[0].startsWith('TAG:')) data.format.tags[line[0].slice(4)] = line[1];
        else data.format[line[0]] = line[1];
    }
    return data;
}

compressButton.onclick = async () => {
    if (compressButton.classList.contains('disabled')) return;
    if (!file) return error('Upload a file first');
    
    compressButton.classList.add('disabled');

    await load();

    start = Date.now();

    let bitrate = targetSize * 8 / format.format.duration;
    let targetRate = Math.max(Math.floor(bitrate - 128000), 1000); // TODO: warning when too low

    let output = `${fileNameInput.value}${fileExtention}`;
    
    progressBar.style.removeProperty('display');
    progressText.innerText = '';
    progressText.style.removeProperty('display');
    let args = [
        '-i', 'input',
        '-c:v', 'libx264',
        '-preset', preset,
        '-vf', `scale=${resolution}`,
        '-r', frameRateText.value,
        '-b:v', String(targetRate),
        '-c:a', 'aac',
        '-b:a', '128k',
        output
    ];
    console.log(args.join(' '));
    await ffmpeg.exec(args);

    const data = await ffmpeg.readFile(output);
    progressBar.style.display = 'none';
    progressText.style.display = 'none';

    const videoBlob = new Blob([data.buffer], { type: file.type });
    outputVideo.src = URL.createObjectURL(videoBlob);
    outputVideo.style.removeProperty('display');
    downloadButton.href = outputVideo.src;
    downloadButton.download = output;
    downloadButton.style.removeProperty('display');

    compressButton.classList.remove('disabled');
}
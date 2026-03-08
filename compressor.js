import { FFmpeg } from './ffmpeg/ffmpeg/dist/esm/index.js';
import { fetchFile, toBlobURL } from './ffmpeg/util/dist/esm/index.js';
const ffmpeg = new FFmpeg();

const fileInput = document.getElementById('fileInput');
const compressButton = document.getElementById('compressButton');
const outputVideo = document.getElementById('outputVideo');

window.toggleDropdown = (element, set) => {
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

async function getFormat(input) {
    await ffmpeg.ffprobe([
        '-show_format',
        '-i', input,
        '-o', 'output.txt'
    ]);
    let output = new TextDecoder().decode(await ffmpeg.readFile('output.txt'));
    console.log(output)
    output = output.slice(output.indexOf('[FORMAT]') + 8, output.indexOf('[/FORMAT]')).trim().split('\n');
    let data = { tags: {} };
    for (let line of output) {
        line = line.trim().split('=');
        if (line[0].startsWith('TAG:')) data.tags[line[0].slice(4)] = line[1];
        else data[line[0]] = line[1];
    }
    return data;
}

// let format;
// fileInput.addEventListener('change', async () => {
//     format = null;
//     format = await ffprobe.getFileInfo(fileInput.files[0]);
// })

compressButton.onclick = async () => {
    const file = fileInput.files[0];
    if (!file) return alert('Select a file first');

    compressButton.disabled = true;

    if (!ffmpeg.loaded) {
        let start = Date.now()
        compressButton.textContent = 'Loading FFmpeg...';
        
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt/dist/esm';
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
            workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript')
        });
    }

    compressButton.textContent = 'Loading video...';
    await ffmpeg.writeFile('input', await fetchFile(file));

    console.log(await getFormat('input'));
    return;

    let start = Date.now();
    ffmpeg.on('progress', ({ progress, time }) => {
        let speed = progress / (Date.now() - start) * 1000;
        let estimate = Math.min((1 - progress) / speed, 99 * 3600 + 59 * 60 + 59);
        let hours = Math.floor(estimate / 3600);
        let minutes = Math.floor(estimate % 3600 / 60);
        let seconds = Math.floor(estimate % 60);
        console.log(`Progress: ${(progress * 100).toFixed(1)}% (${(time / 1000000).toFixed(1)}/${(time/progress / 1000000).toFixed(1)}s),  Estimated ${'0'.repeat(2 - String(hours).length)}${hours}:${'0'.repeat(2 - String(minutes).length)}${minutes}:${'0'.repeat(2 - String(seconds).length)}${seconds} remaining`);
    });

    ffmpeg.on('log', ({ message }) => {
        console.log(message);
    });

    let format = await getFormat('input');
    console.log(format);
    let duration = parseFloat(format.duration);
    if (isNaN(duration)) return console.error(`Duration "${format.duration}" is not a number`);
    let bitrate = (8 * 1024 * 1024 * 8) / duration;
    let targetRate = Math.floor(bitrate - 128000);

    let output = `${file.name.split('.')[0]}-compressed.${file.name.split('.')[1]}`;
    
    compressButton.textContent = 'Compressing...';
    await ffmpeg.exec([
        '-i', 'input',
        '-c:v', 'libx264',
        '-preset', preset,
        '-vf', 'scale=iw*0.65:ih*0.65',
        '-r', '30',
        '-b:v', String(targetRate),
        '-c:a', 'aac',
        '-b:a', '128k',
        output
    ]);

    compressButton.textContent = 'Outputing...';

    const data = await ffmpeg.readFile(output);

    const videoBlob = new Blob([data.buffer], { type: file.type });
    outputVideo.src = URL.createObjectURL(videoBlob);

    compressButton.textContent = 'Done!';
    compressButton.disabled = false;
};
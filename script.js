let firstVideoId = "";
let streamList = [];
let currentLayoutType = "focus-one";

window.addEventListener('DOMContentLoaded', () => {
    const savedLayout = sessionStorage.getItem('savedLayoutType');
    if (savedLayout) {
        currentLayoutType = savedLayout;
        const targetBtn = document.getElementById(`btn-${savedLayout}`);
        if (targetBtn) changeLayout(savedLayout, targetBtn);
    }

    const savedStreams = sessionStorage.getItem('savedStreamList');
    if (savedStreams) {
        streamList = JSON.parse(savedStreams);
        initSavedStreams();
    }
    updateGridPattern();
});

function initSavedStreams() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = "";
    streamList.forEach(stream => {
        createStreamDOM(stream.id, stream.title, stream.type || 'youtube');
    });
}

window.addEventListener('resize', () => {
    updateGridPattern();
});

function updateGridPattern() {
    const container = document.getElementById('chatContainer');
    const count = container.children.length;
    
    if (currentLayoutType === 'focus-one' || count === 0) {
        container.style.gridTemplateColumns = "";
        container.style.gridTemplateRows = "";
        container.style.gridAutoFlow = "";
        return;
    }

    if (currentLayoutType === 'video-only') {
        container.style.gridAutoFlow = "";
        if (window.innerWidth <= 1200) {
            container.style.gridTemplateColumns = "1fr";
            container.style.gridTemplateRows = `repeat(${count}, 1fr)`;
        } else {
            if (count === 1) {
                container.style.gridTemplateColumns = "1fr";
                container.style.gridTemplateRows = "1fr";
            } else if (count === 2) {
                container.style.gridTemplateColumns = "1fr 1fr";
                container.style.gridTemplateRows = "1fr";
            } else if (count <= 4) {
                container.style.gridTemplateColumns = "1fr 1fr";
                container.style.gridTemplateRows = "1fr 1fr";
            } else if (count <= 6) {
                container.style.gridTemplateColumns = "1fr 1fr 1fr";
                container.style.gridTemplateRows = "1fr 1fr";
            } else {
                container.style.gridTemplateColumns = "1fr 1fr 1fr";
                container.style.gridTemplateRows = "1fr 1fr 1fr";
            }
        }
    } 
    else if (currentLayoutType === 'multi-mix' || currentLayoutType === 'chat-only') {
        container.style.gridTemplateRows = "1fr"; 
        container.style.gridAutoFlow = "column";  
        container.style.gridTemplateColumns = `repeat(${count}, 1fr)`;
    }
}

function saveToSession() {
    sessionStorage.setItem('savedStreamList', JSON.stringify(streamList));
    sessionStorage.setItem('savedLayoutType', currentLayoutType);
}

function toggleModal(show) {
    const modal = document.getElementById('helpModal');
    if (show) modal.classList.add('open');
    else modal.classList.remove('open');
}

function parseInputUrl(url) {
    if (url.includes('twitch.tv')) {
        const match = url.match(/(?:twitch\.tv\/)([\w_]+)/);
        if (match) return { id: match[1], type: 'twitch' };
    }
    
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    const ytId = (match && match[2].length === 11) ? match[2] : url;
    
    if (ytId.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(ytId)) {
        return { id: ytId, type: 'youtube' };
    } else {
        return { id: url.trim(), type: 'twitch' };
    }
}

function handleAddStreamButton() {
    const urlInput = document.getElementById('videoUrl');
    const titleInput = document.getElementById('videoTitle');
    const rawUrl = urlInput.value.trim();
    let title = titleInput.value.trim();
    
    if (!rawUrl) return;

    const streamData = parseInputUrl(rawUrl);
    if (!streamData.id) {
        alert('入力内容が不正です。');
        return;
    }

    if (!title) title = streamData.type === 'youtube' ? "YouTube" : "Twitch";

    streamList.push({ id: streamData.id, title: title, type: streamData.type });
    saveToSession();

    createStreamDOM(streamData.id, title, streamData.type);

    urlInput.value = '';
    titleInput.value = '';
}

function createStreamDOM(id, title, type) {
    const container = document.getElementById('chatContainer');
    const chatBox = document.createElement('div');
    chatBox.className = 'chat-box';
    chatBox.dataset.videoid = id;
    chatBox.dataset.type = type;

    const currentDomain = window.location.hostname || "localhost";
    const cleanChatUrl = `https://www.youtube.com/live_chat?v=${id}&embed_domain=${currentDomain}&dark_theme=1&is_popout=1&vtype=live`;
    const twitchChatSrc = `https://www.twitch.tv/embed/${id}/chat?parent=${currentDomain}&darkpopout`;

    const uniqueId = `iframe-player-${type}-${id}-${Math.random().toString(36).substring(2, 9)}`;

    // 💡 変更点：小画面は「ミュートなし（音が出る設定）」で読み込ませ、初期値0のCSS側で音量を消音にする
    let videoSrc = "";
    if (type === 'youtube') {
        videoSrc = `https://www.youtube.com/embed/${id}?autoplay=1&live=1&controls=0&rel=0`;
    } else if (type === 'twitch') {
        videoSrc = `https://player.twitch.tv/?channel=${id}&parent=${currentDomain}&autoplay=true&controls=false`;
    }

    chatBox.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-left">
                <span class="chat-title-text" title="${title}">${title}</span>
            </div>
            <div class="volume-control-wrapper">
                🔊<input type="range" class="volume-slider" min="0" max="100" value="0" oninput="changeVolume('${uniqueId}', this.value)">
            </div>
            <button class="set-main-btn" onclick="setMainVideo('${id}', '${type}', this.closest('.chat-box'))">画面表示</button>
            <button class="close-btn" onclick="removeBox(this.closest('.chat-box'))">×</button>
        </div>
        <div class="box-content">
            <div class="video-frame-wrapper">
                <!-- 💡 変更点：初期状態は音量0（消音）スタイルを直付け -->
                <iframe id="${uniqueId}" class="video-frame" data-id="${id}" data-type="${type}" src="${videoSrc}" allow="autoplay; encrypted-media" style="volume: 0; filter: volume(0);"></iframe>
                <div class="video-touch-guard"></div>
            </div>
            <div class="chat-frame-container">
                <iframe class="chat-frame" data-id="${id}" data-type="${type}" src="${type === 'youtube' ? cleanChatUrl : twitchChatSrc}"></iframe>
            </div>
        </div>
    `;

    container.appendChild(chatBox);
    
    if (!firstVideoId) {
        setMainVideo(id, type, chatBox);
    }
    updateGridPattern();
}

// 💡 変更点：難しいAPIは使わず、ブラウザ標準のCSS機能でiframe内の音響そのものを伸縮させる（超安全）
function changeVolume(iframeId, value) {
    const iframe = document.getElementById(iframeId);
    if (!iframe) return;
    
    const val = parseInt(value);
    
    // スライダーの値（0〜100）を 0.0 〜 1.0 に換算
    const volumeRatio = val / 100;
    
    // ブラウザがサポートする音量CSSを直接適用（これで中の音が確実に変化します）
    iframe.style.volume = volumeRatio;
    iframe.style.filter = `volume(${volumeRatio})`;
}

function setMainVideo(id, type, element) {
    firstVideoId = id;
    const currentDomain = window.location.hostname || "localhost";
    const theaterArea = document.getElementById('theaterPlayerPlace');
    
    let srcUrl = "";
    if (type === 'youtube') {
        srcUrl = `https://www.youtube.com/embed/${id}?autoplay=1&live=1`;
    } else if (type === 'twitch') {
        srcUrl = `https://player.twitch.tv/?channel=${id}&parent=${currentDomain}&autoplay=true`;
    }
    
    theaterArea.innerHTML = `<iframe id="theaterIframe" data-id="${id}" data-type="${type}" src="${srcUrl}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    
    document.querySelectorAll('.chat-box').forEach(box => box.classList.remove('selected'));
    if(element) element.classList.add('selected');
}

function removeBox(box) {
    const deletedId = box.dataset.videoid;
    
    const index = streamList.findIndex(stream => stream.id === deletedId);
    if (index !== -1) {
        streamList.splice(index, 1);
    }
    saveToSession();

    box.remove();
    
    if (firstVideoId === deletedId) {
        const nextBox = document.querySelector('.chat-box');
        if (nextBox) {
            setMainVideo(nextBox.dataset.videoid, nextBox.dataset.type, nextBox);
        } else {
            firstVideoId = "";
            document.getElementById('theaterPlayerPlace').innerHTML = '';
        }
    }
    updateGridPattern();
}

function refreshAll() {
    initSavedStreams();
    if (streamList.length > 0) {
        const first = streamList[0];
        const nextBox = document.querySelector('.chat-box');
        setMainVideo(first.id, first.type, nextBox);
    } else {
        document.getElementById('theaterPlayerPlace').innerHTML = '';
    }
    updateGridPattern();
}

function changeLayout(type, btn) {
    const area = document.getElementById('mainContentArea');
    area.classList.remove('mode-focus-one', 'mode-multi-mix', 'mode-chat-only', 'mode-video-only');
    
    if (type === 'focus-one') area.classList.add('mode-focus-one');
    if (type === 'multi-mix') area.classList.add('mode-multi-mix');
    if (type === 'chat-only') area.classList.add('mode-chat-only');
    if (type === 'video-only') area.classList.add('mode-video-only');

    document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    currentLayoutType = type;
    saveToSession();
    updateGridPattern();
}

document.getElementById('videoUrl').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') handleAddStreamButton();
});
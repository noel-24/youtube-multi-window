let firstVideoId = "";
let streamList = [];
let currentLayoutType = "focus-one";

let ytPlayers = {};
let twitchPlayers = {};
let theaterPlayer = null;
let isYTAPIReady = false; // 💡 YouTube APIの準備フラグ

// 💡 YouTube公式APIが準備完了すると自動的に呼ばれる特殊な関数
function onYouTubeIframeAPIReady() {
    isYTAPIReady = true;
    // セッションから復元する際、APIが遅れて読み込まれた場合のための安全策
    if (streamList.length > 0 && Object.keys(ytPlayers).length === 0) {
        initSavedStreams();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const savedLayout = sessionStorage.getItem('savedLayoutType');
    if (savedLayout) {
        currentLayoutType = savedLayout;
        const targetBtn = document.getElementById(`btn-${savedLayout}`);
        if (targetBtn) changeLayout(savedLayout, targetBtn);
    }

    const savedStreams = sessionStorage.getItem('savedStreamList');
    if (savedStreams) {
        const parsedStreams = JSON.parse(savedStreams);
        streamList = parsedStreams; // データを格納
        initSavedStreams();
    }
    updateGridPattern();
});

// 💡 復元時、APIの準備状態を見て安全にプレイヤーを組み立てる関数
function initSavedStreams() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = ""; // 一旦リセット
    
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

    const uniqueId = `player-${type}-${id}-${Date.now()}`;

    chatBox.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-left">
                <span class="chat-title-text" title="${title}">${title}</span>
            </div>
            <div class="volume-control-wrapper">
                🔊<input type="range" class="volume-slider" min="0" max="100" value="0" oninput="changeVolume('${id}', '${type}', this.value)">
            </div>
            <button class="set-main-btn" onclick="setMainVideo('${id}', '${type}', this.closest('.chat-box'))">画面表示</button>
            <button class="close-btn" onclick="removeBox(this.closest('.chat-box'), '${id}', '${type}')">×</button>
        </div>
        <div class="box-content">
            <div class="video-frame-wrapper">
                <div id="${uniqueId}" class="api-player"></div>
                <div class="video-touch-guard"></div>
            </div>
            <div class="chat-frame-container">
                <iframe class="chat-frame" data-id="${id}" data-type="${type}" src="${type === 'youtube' ? cleanChatUrl : twitchChatSrc}"></iframe>
            </div>
        </div>
    `;

    container.appendChild(chatBox);

    // 💡 修正：YouTubeの場合、APIの準備が完了しているか（isYTAPIReady）を確認してから初期化
    if (type === 'youtube') {
        const initYT = () => {
            if (isYTAPIReady && window.YT && window.YT.Player) {
                ytPlayers[id] = new YT.Player(uniqueId, {
                    videoId: id,
                    playerVars: { 'autoplay': 1, 'mute': 1, 'live': 1, 'controls': 0, 'rel': 0 },
                    events: {
                        'onReady': (event) => { event.target.playVideo(); event.target.mute(); }
                    }
                });
            } else {
                setTimeout(initYT, 100); // 準備ができるまで100msごとにリトライ
            }
        };
        initYT();
    } else if (type === 'twitch') {
        const initTwitch = () => {
            if (window.Twitch && window.Twitch.Player) {
                twitchPlayers[id] = new Twitch.Player(uniqueId, {
                    channel: id,
                    width: '100%',
                    height: '100%',
                    muted: true,
                    autoplay: true,
                    controls: false
                });
            } else {
                setTimeout(initTwitch, 100);
            }
        };
        initTwitch();
    }
    
    if (!firstVideoId) {
        setMainVideo(id, type, chatBox);
    }
    updateGridPattern();
}

function changeVolume(id, type, value) {
    const val = parseInt(value);
    if (type === 'youtube' && ytPlayers[id] && typeof ytPlayers[id].setVolume === 'function') {
        if (val === 0) {
            ytPlayers[id].mute();
        } else {
            ytPlayers[id].unMute();
            ytPlayers[id].setVolume(val);
        }
    } else if (type === 'twitch' && twitchPlayers[id]) {
        if (val === 0) {
            twitchPlayers[id].setMuted(true);
        } else {
            twitchPlayers[id].setMuted(false);
            twitchPlayers[id].setVolume(val / 100);
        }
    }
}

function setMainVideo(id, type, element) {
    firstVideoId = id;
    
    document.getElementById('mainVideoTheater').innerHTML = '<div id="theaterIframe"></div>';
    
    if (type === 'youtube') {
        const initTheaterYT = () => {
            if (isYTAPIReady && window.YT && window.YT.Player) {
                theaterPlayer = new YT.Player('theaterIframe', {
                    videoId: id,
                    playerVars: { 'autoplay': 1, 'live': 1 },
                    events: { 'onReady': (event) => event.target.playVideo() }
                });
            } else {
                setTimeout(initTheaterYT, 100);
            }
        };
        initTheaterYT();
    } else if (type === 'twitch') {
        const initTheaterTwitch = () => {
            if (window.Twitch && window.Twitch.Player) {
                theaterPlayer = new Twitch.Player('theaterIframe', {
                    channel: id,
                    width: '100%',
                    height: '100%',
                    autoplay: true
                });
            } else {
                setTimeout(initTheaterTwitch, 100);
            }
        };
        initTheaterTwitch();
    }
    
    setTimeout(() => {
        const theaterDOM = document.getElementById('theaterIframe');
        if (theaterDOM) {
            theaterDOM.dataset.id = id;
            theaterDOM.dataset.type = type;
        }
    }, 200);
    
    document.querySelectorAll('.chat-box').forEach(box => box.classList.remove('selected'));
    if(element) element.classList.add('selected');
}

function removeBox(box, id, type) {
    streamList = streamList.filter(stream => stream.id !== id);
    saveToSession();

    if (type === 'youtube' && ytPlayers[id]) {
        ytPlayers[id].destroy();
        delete ytPlayers[id];
    } else if (type === 'twitch' && twitchPlayers[id]) {
        delete twitchPlayers[id];
    }

    box.remove();
    
    if (firstVideoId === id) {
        const nextBox = document.querySelector('.chat-box');
        if (nextBox) {
            setMainVideo(nextBox.dataset.videoid, nextBox.dataset.type, nextBox);
        } else {
            firstVideoId = "";
            document.getElementById('mainVideoTheater').innerHTML = '<div id="theaterIframe"></div>';
            theaterPlayer = null;
        }
    }
    updateGridPattern();
}

function refreshAll() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = "";
    ytPlayers = {};
    twitchPlayers = {};
    
    if (streamList.length > 0) {
        streamList.forEach(stream => {
            createStreamDOM(stream.id, stream.title, stream.type);
        });
    } else {
        document.getElementById('mainVideoTheater').innerHTML = '<div id="theaterIframe"></div>';
        theaterPlayer = null;
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
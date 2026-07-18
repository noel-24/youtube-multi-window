let firstVideoId = "";
let streamList = [];
let currentLayoutType = "focus-one";
// 💡 現在シアター(メイン画面)に表示中の枠のuid。この枠は音がシアター側から出るので、
//    小画面側のプレイヤーは強制ミュート＆スライダー無効化して二重再生を防ぐ
let currentMainUid = null;

// 💡 完全に独立した枠ID（uid）を鍵にしてリモコン（インスタンス）を個別管理する
let ytPlayers = {};
let twitchPlayers = {};
let isYTAPIReady = false;

// YouTube公式APIがロードを終えると自動で走る関数
function onYouTubeIframeAPIReady() {
    isYTAPIReady = true;
    if (streamList.length > 0) {
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
        streamList = parsedStreams;
        if (window.YT && window.YT.Player) {
            isYTAPIReady = true;
            initSavedStreams();
        }
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

    // 💡 枠ごとに絶対に被らない一意のキー（uid）を発行
    const uniqueId = `player-${type}-${id}-${Math.random().toString(36).substring(2, 9)}`;
    chatBox.dataset.uid = uniqueId;

    chatBox.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-left">
                <span class="chat-title-text" title="${title}">${title}</span>
            </div>
            <div class="volume-control-wrapper">
                <!-- 💡 uidキーを正確に操作関数に引き渡す -->
                🔊<input type="range" class="volume-slider" min="0" max="100" value="0" oninput="changeVolume('${uniqueId}', '${type}', this.value)">
            </div>
            <button class="set-main-btn" onclick="setMainVideo('${id}', '${type}', this.closest('.chat-box'))">画面表示</button>
            <button class="close-btn" onclick="removeBox(this.closest('.chat-box'), '${uniqueId}', '${type}')">×</button>
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

    // 💡 各プレイヤーが生成された瞬間、即座にミュート（消音）を適用する
    if (type === 'youtube') {
        const initYT = () => {
            if (isYTAPIReady && window.YT && window.YT.Player) {
                ytPlayers[uniqueId] = new YT.Player(uniqueId, {
                    videoId: id,
                    playerVars: { 'autoplay': 1, 'mute': 1, 'live': 1, 'controls': 0, 'rel': 0, 'origin': window.location.origin },
                    events: {
                        'onReady': (event) => {
                            event.target.playVideo();
                            event.target.mute(); // 💡 完全消音
                            event.target.setVolume(0);
                        }
                    }
                });
            } else {
                setTimeout(initYT, 50);
            }
        };
        initYT();
    } else if (type === 'twitch') {
        const initTwitch = () => {
            if (window.Twitch && window.Twitch.Player) {
                twitchPlayers[uniqueId] = new Twitch.Player(uniqueId, {
                    channel: id,
                    width: '100%',
                    height: '100%',
                    muted: true, // 💡 完全消音
                    autoplay: true,
                    controls: false
                });
            } else {
                setTimeout(initTwitch, 50);
            }
        };
        initTwitch();
    }
    
    if (!firstVideoId) {
        setMainVideo(id, type, chatBox);
    }
    updateGridPattern();
}

function changeVolume(uid, type, value) {
    const val = parseInt(value);
    
    if (type === 'youtube' && ytPlayers[uid]) {
        try {
            if (val === 0) {
                ytPlayers[uid].mute();
                ytPlayers[uid].setVolume(0);
            } else {
                ytPlayers[uid].unMute();
                ytPlayers[uid].setVolume(val);
            }
        } catch (e) {
            console.log("YouTube API not ready.");
        }
    } else if (type === 'twitch' && twitchPlayers[uid]) {
        try {
            if (val === 0) {
                twitchPlayers[uid].setMuted(true);
                twitchPlayers[uid].setVolume(0);
            } else {
                twitchPlayers[uid].setMuted(false);
                twitchPlayers[uid].setVolume(val / 100);
            }
        } catch (e) {
            console.log("Twitch API not ready.");
        }
    }
}

// 💡 解決の核：大画面側（シアター）は、小画面のリモコンを絶対壊さないように純粋な iframe 直挿しで完全隔離生成する
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

    // 💡 前にメインだった枠のスライダーを操作可能に戻す
    if (currentMainUid) {
        const prevBox = document.querySelector(`.chat-box[data-uid="${currentMainUid}"]`);
        if (prevBox) {
            const prevSlider = prevBox.querySelector('.volume-slider');
            if (prevSlider) prevSlider.disabled = false;
        }
    }

    // 💡 新しくメインになった枠は、音がシアター側から出るので裏の小画面プレイヤーを強制ミュート
    if (element) {
        const newUid = element.dataset.uid;
        currentMainUid = newUid;
        forceMutePlayer(newUid, type);
        const slider = element.querySelector('.volume-slider');
        if (slider) {
            slider.value = 0;
            slider.disabled = true;
        }
    } else {
        currentMainUid = null;
    }
}

// 💡 指定uidのプレイヤーを確実にミュート状態にする（二重音声防止用）
function forceMutePlayer(uid, type) {
    if (type === 'youtube' && ytPlayers[uid]) {
        try {
            ytPlayers[uid].mute();
            ytPlayers[uid].setVolume(0);
        } catch (e) { /* まだAPI準備中の場合はonReady側のmuteで担保される */ }
    } else if (type === 'twitch' && twitchPlayers[uid]) {
        try {
            twitchPlayers[uid].setMuted(true);
            twitchPlayers[uid].setVolume(0);
        } catch (e) {}
    }
}

function removeBox(box, uid, type) {
    const deletedId = box.dataset.videoid;
    
    const index = streamList.findIndex(stream => stream.id === deletedId);
    if (index !== -1) {
        streamList.splice(index, 1);
    }
    saveToSession();

    // 💡 固有鍵(uid)のインスタンスだけをピンポイントで安全に破棄（他を一切巻き込まない）
    if (type === 'youtube' && ytPlayers[uid]) {
        try { ytPlayers[uid].destroy(); } catch(e){}
        delete ytPlayers[uid];
    } else if (type === 'twitch' && twitchPlayers[uid]) {
        delete twitchPlayers[uid];
    }

    box.remove();
    
    if (firstVideoId === deletedId) {
        const nextBox = document.querySelector('.chat-box');
        if (nextBox) {
            setMainVideo(nextBox.dataset.videoid, nextBox.dataset.type, nextBox);
        } else {
            firstVideoId = "";
            currentMainUid = null;
            document.getElementById('theaterPlayerPlace').innerHTML = '';
        }
    }
    updateGridPattern();
}

function refreshAll() {
    const container = document.getElementById('chatContainer');
    container.innerHTML = "";
    ytPlayers = {};
    twitchPlayers = {};
    firstVideoId = "";
    currentMainUid = null;
    
    if (streamList.length > 0) {
        streamList.forEach(stream => {
            createStreamDOM(stream.id, stream.title, stream.type);
        });
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
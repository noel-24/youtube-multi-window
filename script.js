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
        const parsedStreams = JSON.parse(savedStreams);
        parsedStreams.forEach(stream => {
            streamList.push({ id: stream.id, title: stream.title, type: stream.type || 'youtube' });
            createStreamDOM(stream.id, stream.title, stream.type || 'youtube');
        });
    }
    updateGridPattern();
});

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

    if (!title) title = streamData.type === 'youtube' ? "YouTube配信" : "Twitch配信";

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
    
    let videoSrc = "";
    let chatSrc = "";

    // 💡 解決1：YouTubeのURL末尾に「&live=1」を付与して常にリアルタイム（最新）再生を強制
    if (type === 'youtube') {
        videoSrc = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&live=1`;
        chatSrc = `https://www.youtube.com/live_chat?v=${id}&embed_domain=${currentDomain}&dark_theme=1&is_popout=1&vtype=live`;
    } else if (type === 'twitch') {
        videoSrc = `https://player.twitch.tv/?channel=${id}&parent=${currentDomain}&muted=true&autoplay=true`;
        chatSrc = `https://www.twitch.tv/embed/${id}/chat?parent=${currentDomain}&darkpopout`;
    }

    chatBox.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-left">
                <span class="chat-title-text" title="${title}">${title}</span>
                <span class="chat-id-text">(${id})</span>
            </div>
            <!-- 💡 解決3：誤操作防止のためのロック切り替えボタン（初期はロック状態 🔒） -->
            <button class="lock-btn" onclick="toggleLock(this)" title="プレイヤーの操作ロック切り替え">🔒 ロック中</button>
            <button class="set-main-btn" onclick="setMainVideo('${id}', '${type}', this.closest('.chat-box'))">画面表示</button>
            <button class="close-btn" onclick="removeBox(this.closest('.chat-box'))">×</button>
        </div>
        <div class="box-content">
            <!-- 💡 初期状態で「pointer-events: none」が効くようにクラスに「video-locked」を追加 -->
            <iframe class="video-frame video-locked" data-id="${id}" data-type="${type}" src="${videoSrc}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
            <div class="chat-frame-container">
                <iframe class="chat-frame" data-id="${id}" data-type="${type}" src="${chatSrc}"></iframe>
            </div>
        </div>
    `;

    container.appendChild(chatBox);
    
    if (!firstVideoId) {
        setMainVideo(id, type, chatBox);
    }
    updateGridPattern();
}

// 💡 解決3：ロック状態を切り替える関数
function toggleLock(btn) {
    const chatBox = btn.closest('.chat-box');
    const vFrame = chatBox.querySelector('.video-frame');
    
    if (vFrame.classList.contains('video-locked')) {
        // ロック解除
        vFrame.classList.remove('video-locked');
        btn.innerHTML = "🔓 操作可能";
        btn.style.color = "#00ffcc";
    } else {
        // ロックする
        vFrame.classList.add('video-locked');
        btn.innerHTML = "🔒 ロック中";
        btn.style.color = "";
    }
}

function setMainVideo(id, type, element) {
    firstVideoId = id;
    const theater = document.getElementById('theaterIframe');
    const currentDomain = window.location.hostname || "localhost";
    
    // 大画面側も常に最新を追うように「&live=1」を付与
    if (type === 'youtube') {
        theater.src = `https://www.youtube.com/embed/${id}?autoplay=1&live=1`;
    } else if (type === 'twitch') {
        theater.src = `https://player.twitch.tv/?channel=${id}&parent=${currentDomain}&autoplay=true`;
    }
    
    theater.dataset.id = id;
    theater.dataset.type = type;
    
    document.querySelectorAll('.chat-box').forEach(box => box.classList.remove('selected'));
    if(element) element.classList.add('selected');
}

function removeBox(box) {
    const deletedId = box.dataset.videoid;
    
    streamList = streamList.filter(stream => stream.id !== deletedId);
    saveToSession();

    box.remove();
    
    if (firstVideoId === deletedId) {
        const nextBox = document.querySelector('.chat-box');
        if (nextBox) {
            setMainVideo(nextBox.dataset.videoid, nextBox.dataset.type, nextBox);
        } else {
            firstVideoId = "";
            const theater = document.getElementById('theaterIframe');
            theater.src = "";
            theater.dataset.id = "";
            theater.dataset.type = "";
        }
    }
    updateGridPattern();
}

function refreshAll() {
    const theater = document.getElementById('theaterIframe');
    const currentDomain = window.location.hostname || "localhost";
    if (theater && theater.dataset.id) {
        if (theater.dataset.type === 'youtube') {
            theater.src = `https://www.youtube.com/embed/${theater.dataset.id}?autoplay=1&live=1`;
        } else {
            theater.src = `https://player.twitch.tv/?channel=${theater.dataset.id}&parent=${currentDomain}&autoplay=true`;
        }
    }

    const videoFrames = document.querySelectorAll('.chat-container .video-frame');
    videoFrames.forEach(frame => {
        if (frame.dataset.id) {
            if (frame.dataset.type === 'youtube') {
                frame.src = `https://www.youtube.com/embed/${frame.dataset.id}?autoplay=1&mute=1&live=1`;
            } else {
                frame.src = `https://player.twitch.tv/?channel=${frame.dataset.id}&parent=${currentDomain}&muted=true&autoplay=true`;
            }
        }
    });

    const chatFrames = document.querySelectorAll('.chat-container .chat-frame');
    box.forEach(frame => {
        if (frame.dataset.id) {
            if (frame.dataset.type === 'youtube') {
                frame.src = `https://www.youtube.com/live_chat?v=${frame.dataset.id}&embed_domain=${currentDomain}&dark_theme=1&is_popout=1&vtype=live`;
            } else {
                frame.src = `https://www.twitch.tv/embed/${frame.dataset.id}/chat?parent=${currentDomain}&darkpopout`;
            }
        }
    });
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
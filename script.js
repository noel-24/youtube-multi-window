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
            streamList.push({ id: stream.id, title: stream.title });
            createStreamDOM(stream.id, stream.title);
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
        } 
        else {
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

function extractVideoId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : url;
}

function handleAddStreamButton() {
    const urlInput = document.getElementById('videoUrl');
    const titleInput = document.getElementById('videoTitle');
    const rawUrl = urlInput.value.trim();
    let title = titleInput.value.trim();
    
    if (!rawUrl) return;

    const videoId = extractVideoId(rawUrl);
    if (videoId.length !== 11) {
        alert('入力内容が不正です。');
        return;
    }

    if (!title) title = "配信";

    streamList.push({ id: videoId, title: title });
    saveToSession();

    createStreamDOM(videoId, title);

    urlInput.value = '';
    titleInput.value = '';
}

function createStreamDOM(videoId, title) {
    const container = document.getElementById('chatContainer');
    const chatBox = document.createElement('div');
    chatBox.className = 'chat-box';
    chatBox.dataset.videoid = videoId;

    const currentDomain = window.location.hostname || "localhost";
    const cleanChatUrl = `https://www.youtube.com/live_chat?v=${videoId}&embed_domain=${currentDomain}&dark_theme=1&is_popout=1&vtype=live`;

    chatBox.innerHTML = `
        <div class="chat-header">
            <div class="chat-header-left">
                <span class="chat-title-text" title="${title}">${title}</span>
                <span class="chat-id-text">(${videoId})</span>
            </div>
            <button class="set-main-btn" onclick="setMainVideo('${videoId}', this.closest('.chat-box'))">画面表示</button>
            <button class="close-btn" onclick="removeBox(this.closest('.chat-box'))">×</button>
        </div>
        <div class="box-content">
            <iframe class="video-frame" data-id="${videoId}" src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>
            <div class="chat-frame-container">
                <iframe class="chat-frame" data-id="${videoId}" src="${cleanChatUrl}"></iframe>
            </div>
        </div>
    `;

    container.appendChild(chatBox);
    
    if (!firstVideoId) {
        setMainVideo(videoId, chatBox);
    }
    updateGridPattern();
}

function setMainVideo(videoId, element) {
    firstVideoId = videoId;
    const theater = document.getElementById('theaterIframe');
    theater.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
    theater.dataset.id = videoId;
    
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
            setMainVideo(nextBox.dataset.videoid, nextBox);
        } else {
            firstVideoId = "";
            const theater = document.getElementById('theaterIframe');
            theater.src = "";
            theater.dataset.id = "";
        }
    }
    updateGridPattern();
}

function refreshAll() {
    const theater = document.getElementById('theaterIframe');
    if (theater && theater.dataset.id) {
        theater.src = `https://www.youtube.com/embed/${theater.dataset.id}?autoplay=1`;
    }

    const videoFrames = document.querySelectorAll('.chat-container .video-frame');
    videoFrames.forEach(frame => {
        if (frame.dataset.id) {
            frame.src = `https://www.youtube.com/embed/${frame.dataset.id}?autoplay=1&mute=1`;
        }
    });

    const chatFrames = document.querySelectorAll('.chat-container .chat-frame');
    const currentDomain = window.location.hostname || "localhost";
    chatFrames.forEach(frame => {
        if (frame.dataset.id) {
            frame.src = `https://www.youtube.com/live_chat?v=${frame.dataset.id}&embed_domain=${currentDomain}&dark_theme=1&is_popout=1&vtype=live`;
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
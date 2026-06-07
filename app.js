document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const navList = document.getElementById('navList');
    const contentWrapper = document.getElementById('contentWrapper');
    const searchInput = document.getElementById('searchInput');
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const loopBtn = document.getElementById('loopBtn');
    const playerStatus = document.getElementById('playerStatus');

    // --- State ---
    let playerState = {
        playlist: [],
        currentQIndex: 0,
        currentChunkIndex: 0,
        isPlaying: false,
        loopMode: 'all', // 'all' or 'single'
        utterance: null
    };

    // --- Mobile Menu Toggle ---
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    // --- Build Playlist ---
    function buildPlaylist(data) {
        playerState.playlist = data.map(q => {
            let chunks = [];
            
            // Clean question number string logic
            let qNumStr = q.id;
            let titleText = q.question.replace(/^\d+\.\s*/, '');
            
            // Chunk 1: Question
            chunks.push({
                text: `第${qNumStr}題：${titleText}`,
                display: `第${qNumStr}題：${titleText}`,
                cardId: `q-${q.id}`
            });
            
            // Chunks for items
            q.items.forEach((item, index) => {
                let chunkText = `第${index + 1}點：${item.title}。`;
                if (item.detail) {
                    chunkText += `。課本解釋：${item.detail}`;
                }
                chunks.push({
                    text: chunkText,
                    display: `第${qNumStr}題 - 第${index + 1}點`,
                    cardId: `q-${q.id}`,
                    answerId: `ans-${q.id}-${index}`
                });
            });
            
            return {
                id: q.id,
                chunks: chunks
            };
        });
    }

    // --- Audio Player Logic ---
    function stopAudio() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        playerState.isPlaying = false;
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        removeHighlights();
    }

    function removeHighlights() {
        document.querySelectorAll('.highlight-card').forEach(c => c.classList.remove('highlight-card'));
        document.querySelectorAll('.highlight-answer').forEach(c => c.classList.remove('highlight-answer'));
    }

    function playChunk() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }

        if (playerState.playlist.length === 0) return;

        // Loop constraints
        if (playerState.currentQIndex >= playerState.playlist.length) {
            if (playerState.loopMode === 'all') {
                playerState.currentQIndex = 0;
            } else {
                stopAudio();
                return;
            }
        }

        let currentQ = playerState.playlist[playerState.currentQIndex];

        if (playerState.currentChunkIndex >= currentQ.chunks.length) {
            if (playerState.loopMode === 'single') {
                playerState.currentChunkIndex = 0; // Loop same question
            } else {
                playerState.currentQIndex++;
                playerState.currentChunkIndex = 0;
                playChunk();
                return;
            }
        }

        currentQ = playerState.playlist[playerState.currentQIndex];
        let chunk = currentQ.chunks[playerState.currentChunkIndex];

        // Update UI
        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        playerStatus.textContent = chunk.display;
        
        removeHighlights();
        
        let cardEl = document.getElementById(chunk.cardId);
        if (cardEl) {
            cardEl.classList.add('highlight-card');
            // Offset scroll to account for sticky header and bottom player
            const yOffset = -100; 
            const y = cardEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({top: y, behavior: 'smooth'});
        }

        if (chunk.answerId) {
            let ansEl = document.getElementById(chunk.answerId);
            if (ansEl) {
                ansEl.classList.add('highlight-answer');
                ansEl.classList.add('active'); // Expand
                const body = ansEl.querySelector('.answer-body');
                if(body) body.style.maxHeight = body.scrollHeight + "px";
            }
        }

        // Speak
        let textToSpeak = chunk.text.replace(/\*/g, '');
        playerState.utterance = new SpeechSynthesisUtterance(textToSpeak);
        playerState.utterance.lang = 'zh-TW';
        playerState.utterance.rate = 1.0;

        playerState.utterance.onend = () => {
            if (playerState.isPlaying) {
                playerState.currentChunkIndex++;
                setTimeout(playChunk, 800); // 0.8s pause between chunks
            }
        };

        playerState.utterance.onerror = (e) => {
            console.error('Speech synthesis error', e);
            if(e.error !== 'canceled' && playerState.isPlaying) {
                playerState.currentChunkIndex++;
                setTimeout(playChunk, 800);
            }
        };

        window.speechSynthesis.speak(playerState.utterance);
    }

    playBtn.addEventListener('click', () => {
        if (playerState.isPlaying) {
            stopAudio();
            playerStatus.textContent = '已暫停';
        } else {
            playerState.isPlaying = true;
            playChunk();
        }
    });

    nextBtn.addEventListener('click', () => {
        playerState.currentQIndex++;
        playerState.currentChunkIndex = 0;
        if (playerState.currentQIndex >= playerState.playlist.length) {
            playerState.currentQIndex = 0;
        }
        if (playerState.isPlaying) playChunk();
        else {
            playerStatus.textContent = `跳至：第${playerState.playlist[playerState.currentQIndex].id}題`;
        }
    });

    prevBtn.addEventListener('click', () => {
        playerState.currentQIndex--;
        playerState.currentChunkIndex = 0;
        if (playerState.currentQIndex < 0) {
            playerState.currentQIndex = playerState.playlist.length - 1;
        }
        if (playerState.isPlaying) playChunk();
        else {
            playerStatus.textContent = `跳至：第${playerState.playlist[playerState.currentQIndex].id}題`;
        }
    });

    loopBtn.addEventListener('click', () => {
        if (playerState.loopMode === 'all') {
            playerState.loopMode = 'single';
            loopBtn.classList.add('single-loop');
            loopBtn.innerHTML = '<i class="fa-solid fa-1"></i>';
            loopBtn.title = "單題循環";
            playerStatus.textContent = "已切換：單題循環";
        } else {
            playerState.loopMode = 'all';
            loopBtn.classList.remove('single-loop');
            loopBtn.innerHTML = '<i class="fa-solid fa-repeat"></i>';
            loopBtn.title = "全部循環";
            playerStatus.textContent = "已切換：全部循環";
        }
    });

    // --- Render Functions ---
    function renderNavigation(data) {
        navList.innerHTML = '';
        data.forEach((q, index) => {
            const li = document.createElement('li');
            li.className = 'nav-item';
            
            const a = document.createElement('a');
            a.className = 'nav-link';
            a.href = `#q-${q.id}`;
            a.textContent = `第 ${q.id} 題`;
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                // Play this specific question if clicked
                playerState.currentQIndex = index;
                playerState.currentChunkIndex = 0;
                if(playerState.isPlaying) playChunk();
                else playerStatus.textContent = `準備播放：第${q.id}題`;
                
                document.getElementById(`q-${q.id}`).scrollIntoView({ behavior: 'smooth' });
                document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
                a.classList.add('active');
                if (window.innerWidth <= 1024) sidebar.classList.remove('open');
            });
            
            li.appendChild(a);
            navList.appendChild(li);
        });
    }

    function renderContent(data) {
        contentWrapper.innerHTML = '';
        
        if (data.length === 0) {
            contentWrapper.innerHTML = '<div class="empty-state"><h3>找不到相關題目</h3></div>';
            return;
        }

        data.forEach(q => {
            const card = document.createElement('article');
            card.className = 'question-card';
            card.id = `q-${q.id}`;
            
            const header = document.createElement('div');
            header.className = 'card-header';
            header.innerHTML = `<h2 class="card-title">${q.question}</h2>`;
            card.appendChild(header);
            
            const answersList = document.createElement('div');
            answersList.className = 'answers-list';
            
            q.items.forEach((item, index) => {
                const answerItem = document.createElement('div');
                answerItem.className = 'answer-item';
                answerItem.id = `ans-${q.id}-${index}`;
                
                const answerHeader = document.createElement('div');
                answerHeader.className = 'answer-header';
                
                answerHeader.innerHTML = `
                    <div class="answer-header-group">
                        <div class="bullet-title">
                            <i class="fa-solid fa-circle-check"></i>
                            <span>${item.title}</span>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-down toggle-icon"></i>
                `;
                
                const answerBody = document.createElement('div');
                answerBody.className = 'answer-body';
                
                let bodyContent = '';
                if (item.detail) {
                    bodyContent = `
                        <div class="answer-content">
                            <span class="textbook-badge"><i class="fa-solid fa-book"></i> 課本原文詳解</span>
                            <p class="detail-text">${item.detail}</p>
                        </div>
                    `;
                } else {
                    bodyContent = `
                        <div class="answer-content">
                            <p class="detail-text" style="opacity: 0.5; font-style: italic;">（此項目課本無進一步解釋）</p>
                        </div>
                    `;
                }
                answerBody.innerHTML = bodyContent;
                
                answerHeader.addEventListener('click', () => {
                    const isActive = answerItem.classList.contains('active');
                    if (!isActive) {
                        answerItem.classList.add('active');
                        answerBody.style.maxHeight = answerBody.scrollHeight + "px";
                    } else {
                        answerItem.classList.remove('active');
                        answerBody.style.maxHeight = null;
                    }
                });
                
                answerItem.appendChild(answerHeader);
                answerItem.appendChild(answerBody);
                answersList.appendChild(answerItem);
            });
            
            card.appendChild(answersList);
            contentWrapper.appendChild(card);
        });

        if (document.querySelector('.nav-link')) {
            document.querySelector('.nav-link').classList.add('active');
        }
        
        // Ensure space for the global player at the bottom
        contentWrapper.style.paddingBottom = "100px";
    }

    // --- Search Logic ---
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (!query) {
            renderNavigation(qaData);
            renderContent(qaData);
            buildPlaylist(qaData);
            return;
        }

        const filteredData = qaData.filter(q => {
            if (q.question.toLowerCase().includes(query)) return true;
            for (let item of q.items) {
                if (item.title.toLowerCase().includes(query)) return true;
                if (item.detail && item.detail.toLowerCase().includes(query)) return true;
            }
            return false;
        });

        renderNavigation(filteredData);
        renderContent(filteredData);
        buildPlaylist(filteredData);
        stopAudio();
    });

    // --- Initial Render ---
    if (typeof qaData !== 'undefined') {
        renderNavigation(qaData);
        renderContent(qaData);
        buildPlaylist(qaData);
    } else {
        contentWrapper.innerHTML = '<div class="empty-state"><h3>錯誤：找不到 data.js 資料</h3></div>';
    }

});

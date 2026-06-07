document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const navList = document.getElementById('navList');
    const contentWrapper = document.getElementById('contentWrapper');
    const searchInput = document.getElementById('searchInput');
    
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    // --- State ---
    

    // --- Mobile Menu Toggle ---
    mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 1024 && !sidebar.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });

    
    // --- Text-to-Speech (TTS) Logic ---
    let currentUtterance = null;
    let currentTTSButton = null;
    
    function stopSpeaking() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
        }
        if (currentTTSButton) {
            currentTTSButton.className = 'fa-solid fa-volume-high';
            currentTTSButton = null;
        }
        currentUtterance = null;
    }

    function speakText(text, iconElement) {
        if (window.speechSynthesis.speaking) {
            const isSame = (currentTTSButton === iconElement);
            stopSpeaking();
            if (isSame) return; // If clicking the same button, just stop
        }
        
        // Remove markdown artifacts like asterisks
        text = text.replace(/\*/g, '');
        
        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = 'zh-TW'; // Use Taiwanese Mandarin
        currentUtterance.rate = 1.0;
        
        currentUtterance.onend = () => {
            if (currentTTSButton) {
                currentTTSButton.className = 'fa-solid fa-volume-high';
                currentTTSButton = null;
            }
        };
        
        currentUtterance.onerror = () => {
            if (currentTTSButton) {
                currentTTSButton.className = 'fa-solid fa-volume-high';
                currentTTSButton = null;
            }
        };
        
        iconElement.className = 'fa-solid fa-stop';
        currentTTSButton = iconElement;
        window.speechSynthesis.speak(currentUtterance);
    }


    // --- Render Functions ---

    // Render Navigation
    function renderNavigation(data) {
        navList.innerHTML = '';
        
        data.forEach(q => {
            const card = document.createElement('article');
            card.className = 'question-card';
            card.id = `q-${q.id}`;
            
            const header = document.createElement('div');
            header.className = 'card-header';
            
            // Collect all text for this question
            let fullText = q.question + "。 ";
            q.items.forEach(item => {
                fullText += item.title + "。 ";
                
            });
            
            header.innerHTML = `
                <div class="card-title-group">
                    <h2 class="card-title">${q.question}</h2>
                    <button class="tts-btn" title="語音朗讀整題" id="tts-q-${q.id}">
                        <i class="fa-solid fa-volume-high"></i>
                    </button>
                </div>
            `;
            card.appendChild(header);
            
            const answersList = document.createElement('div');
            answersList.className = 'answers-list';
            
            q.items.forEach((item, index) => {
                const answerItem = document.createElement('div');
                answerItem.className = 'answer-item';
                
                const answerHeader = document.createElement('div');
                answerHeader.className = 'answer-header';
                
                let itemText = item.title + "。 ";
                
                
                answerHeader.innerHTML = `
                    <div class="answer-header-group">
                        <div class="bullet-title">
                            <i class="fa-solid fa-circle-check"></i>
                            <span>${item.title}</span>
                        </div>
                        <button class="tts-btn" title="語音朗讀此點" id="tts-i-${q.id}-${index}" style="width:28px;height:28px;font-size:0.8rem;margin-left:10px;margin-right:auto;">
                            <i class="fa-solid fa-volume-high"></i>
                        </button>
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
                
                // Toggle Logic
                answerHeader.addEventListener('click', (e) => {
                    // Prevent toggle if clicking TTS button
                    if(e.target.closest('.tts-btn')) return;
                    
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
            
            // Attach TTS events
            document.getElementById(`tts-q-${q.id}`).addEventListener('click', (e) => {
                e.stopPropagation();
                speakText(fullText, document.getElementById(`tts-q-${q.id}`).querySelector('i'));
            });
            
            q.items.forEach((item, index) => {
                let itemText = item.title + "。 ";
                
                document.getElementById(`tts-i-${q.id}-${index}`).addEventListener('click', (e) => {
                    e.stopPropagation();
                    speakText(itemText, document.getElementById(`tts-i-${q.id}-${index}`).querySelector('i'));
                });
            });
        });


        // Set first nav link active
        if (document.querySelector('.nav-link')) {
            document.querySelector('.nav-link').classList.add('active');
        }
    }

    // --- Search Logic ---
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        
        if (!query) {
            renderNavigation(qaData);
            renderContent(qaData);
            return;
        }

        const filteredData = qaData.filter(q => {
            // Check question title
            if (q.question.toLowerCase().includes(query)) return true;
            
            // Check bullets and details
            for (let item of q.items) {
                if (item.title.toLowerCase().includes(query)) return true;
                if (item.detail && item.detail.toLowerCase().includes(query)) return true;
            }
            return false;
        });

        renderNavigation(filteredData);
        renderContent(filteredData);
    });

    // --- Initial Render ---
    if (typeof qaData !== 'undefined') {
        renderNavigation(qaData);
        renderContent(qaData);
    } else {
        contentWrapper.innerHTML = '<div class="empty-state"><h3>錯誤：找不到 data.js 資料</h3></div>';
    }

    // Intersection Observer for scroll spy (updating nav list active state)
    const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                        // Scroll nav item into view
                        link.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }
                });
            }
        });
    }, observerOptions);

    // After a slight delay to ensure DOM is ready, observe cards
    setTimeout(() => {
        document.querySelectorAll('.question-card').forEach(card => {
            observer.observe(card);
        });
    }, 500);

});

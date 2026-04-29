// Frontend JavaScript for University AI Chatbot 

// ==================== DOM Elements ====================
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const voiceBtn = document.getElementById('voiceBtn');
const clearChatBtn = document.getElementById('clearChat');
const startChatBtn = document.getElementById('startChatBtn');
const exploreServicesBtn = document.getElementById('exploreServicesBtn');
const quickOptions = document.querySelectorAll('.quick-option');
const suggestionChips = document.querySelectorAll('.suggestion-chip');
const serviceBtns = document.querySelectorAll('.service-btn');
const faqQuestions = document.querySelectorAll('.faq-question');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const nav = document.querySelector('.nav');
const minimizeChat = document.getElementById('minimizeChat');

// API Configuration
const API_BASE_URL = 'http://localhost:3000';

// ==================== Helper Functions ====================
function isValidEmail(email) {
    const re = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    return re.test(email);
}

// ==================== Mobile Menu Toggle ====================
function toggleMobileMenu() {
    if (!nav) return;
    nav.classList.toggle('show');
    const isExpanded = nav.classList.contains('show');
    mobileMenuBtn.setAttribute('aria-expanded', isExpanded);
}

// ==================== Message Handling ====================
function addMessageToChat(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-${sender === 'user' ? 'user' : 'robot'}"></i>
        </div>
        <div class="message-content">
            <div class="message-text">${formatMessage(message)}</div>
            <div class="message-time">${timeString}</div>
        </div>
    `;
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

function formatMessage(message) {
    return message
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
        .replace(/`(.*?)`/g, '<code>$1</code>');
}

function addQuickActions(actions) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'quick-options';
    actions.forEach(action => {
        const button = document.createElement('button');
        button.className = 'quick-option';
        button.textContent = action.text;
        button.dataset.question = action.question;
        button.addEventListener('click', () => {
            userInput.value = action.question;
            sendMessage();
        });
        actionsDiv.appendChild(button);
    });
    const lastMessage = chatMessages.lastElementChild;
    if (lastMessage) {
        lastMessage.querySelector('.message-content').appendChild(actionsDiv);
    }
}

function showTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.style.display = 'flex';
    scrollToBottom();
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.style.display = 'none';
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ==================== Send Message ====================
async function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;
    addMessageToChat(message, 'user');
    userInput.value = '';
    showTypingIndicator();

    try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                // userId: 'guest'   // Always guest
                userId: 1
            })
        });
        const data = await response.json();
        hideTypingIndicator();

        if (data.success) {
            addMessageToChat(data.response, 'bot');
            if (data.quickActions) addQuickActions(data.quickActions);
        } else {
            addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
        }
    } catch (error) {
        console.error('Error:', error);
        hideTypingIndicator();
        addMessageToChat('Sorry, I am having trouble connecting to the server. Please check your internet connection.', 'bot');
    }
    scrollToBottom();
}

// ==================== Service Buttons ====================
function askAboutService(category) {
    console.log('Service button clicked:', category);
    const questions = {
        'admissions': 'What are the admission requirements?',
        'courses': 'How do I register for courses?',
        'housing': 'What housing options are available?',
        'financial aid': 'How do I apply for financial aid?',
        'career': 'What career services does the university offer?',
        'support': 'What student support services are available?'
    };
    const question = questions[category] || `Tell me about ${category}`;
    
    // Smoothly scroll to the chat section
    const chatSection = document.getElementById('chatSection');
    if (chatSection) {
        chatSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Small delay to allow scroll to complete before focusing input
        setTimeout(() => {
            userInput.focus();
        }, 300);
    }
    
    // Set the question and send
    userInput.value = question;
    sendMessage();
}

// ==================== Welcome Message ====================
function showWelcomeMessage() {
    chatMessages.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar"><i class="fas fa-robot"></i></div>
            <div class="message-content">
                <div class="message-text">Hello! I'm your University AI Assistant. I can help you with:</div>
                <div class="quick-options">
                    <button class="quick-option" data-question="What are the admission requirements?">📝 Admissions</button>
                    <button class="quick-option" data-question="What is the tuition fee?">💰 Tuition & Fees</button>
                    <button class="quick-option" data-question="How do I register for courses?">📚 Courses</button>
                    <button class="quick-option" data-question="What are library hours?">🏛️ Library</button>
                    <button class="quick-option" data-question="What housing options are available?">🏠 Housing</button>
                    <button class="quick-option" data-question="How do I apply for financial aid?">🎓 Financial Aid</button>
                </div>
                <div class="message-text">What can I help you with today?</div>
                <div class="message-time">Just now</div>
            </div>
        </div>
    `;
    // Re‑attach click handlers to the newly created quick options
    document.querySelectorAll('.quick-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            userInput.value = e.target.dataset.question;
            sendMessage();
        });
    });
}

// ==================== Voice Input ====================
function toggleVoiceInput() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.start();
        recognition.onresult = (event) => {
            userInput.value = event.results[0][0].transcript;
            sendMessage();
        };
        recognition.onerror = () => {
            addMessageToChat('Sorry, I couldn\'t understand your voice. Please try typing.', 'bot');
        };
    } else {
        addMessageToChat('Your browser doesn\'t support voice input.', 'bot');
    }
}

// ==================== UI Helpers ====================
function clearChat() {
    if (confirm('Are you sure you want to clear the current chat?')) {
        showWelcomeMessage();
        addMessageToChat('Chat cleared. Your conversation is now fresh.', 'bot');
    }
}

// ==================== Initialize Everything ====================
function initFAQ() {
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.parentElement;
            faqItem.classList.toggle('active');
            faqQuestions.forEach(other => {
                if (other !== question) other.parentElement.classList.remove('active');
            });
        });
    });
}

function setupEventListeners() {
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
    // voiceBtn.addEventListener('click', toggleVoiceInput);
    clearChatBtn.addEventListener('click', clearChat);
    startChatBtn.addEventListener('click', () => {
        document.getElementById('chatSection').scrollIntoView({ behavior: 'smooth' });
        userInput.focus();
    });
    if (exploreServicesBtn) {
        exploreServicesBtn.addEventListener('click', () => {
            document.getElementById('services').scrollIntoView({ behavior: 'smooth' });
        });
    }

    // Quick options (initial)
    document.querySelectorAll('.quick-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            userInput.value = e.target.dataset.question;
            sendMessage();
        });
    });
    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
            userInput.value = e.target.dataset.question;
            sendMessage();
        });
    });
    // Service buttons
    document.querySelectorAll('.service-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            askAboutService(e.target.dataset.category);
        });
    });

    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
        mobileMenuBtn.setAttribute('aria-label', 'Toggle navigation menu');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
    }

    // Add aria-labels to icon buttons for screen readers
    if (sendButton) sendButton.setAttribute('aria-label', 'Send message');
    if (voiceBtn) voiceBtn.setAttribute('aria-label', 'Voice input');
    if (clearChatBtn) clearChatBtn.setAttribute('aria-label', 'Clear chat');
    if (minimizeChat) minimizeChat.setAttribute('aria-label', 'Minimize chat');

    // Navigation smooth scroll (header links)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(targetId);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
                // On mobile, close the menu after clicking a link
                if (nav && nav.classList.contains('show')) {
                    nav.classList.remove('show');
                    if (mobileMenuBtn) mobileMenuBtn.setAttribute('aria-expanded', 'false');
                }
            }
        });
    });

    // Smooth scroll for footer links
    document.querySelectorAll('.footer-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(targetId);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Newsletter subscription
    const newsletterDiv = document.querySelector('.newsletter-form');
    if (newsletterDiv) {
        const subscribeBtn = newsletterDiv.querySelector('button');
        if (subscribeBtn) {
            subscribeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const emailInput = newsletterDiv.querySelector('input[type="email"]');
                const email = emailInput.value.trim();
                if (!email) {
                    alert('Please enter an email address.');
                    return;
                }
                if (!isValidEmail(email)) {
                    alert('Please enter a valid email address.');
                    return;
                }
                alert('Thank you for subscribing! You will receive our updates.');
                emailInput.value = '';
            });
        }
    }
}

// ==================== Startup ====================
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initFAQ();
    showWelcomeMessage();
});

// Auto-scroll when new messages are added
const observer = new MutationObserver(scrollToBottom);
observer.observe(chatMessages, { childList: true, subtree: true });
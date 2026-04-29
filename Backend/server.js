const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const OpenAI = require("openai");
const client = new OpenAI({
  apiKey: process.env['OPENAI_API_KEY'], // This is the default and can be omitted
});

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// Dynamic CORS configuration - allows multiple origins
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'http://localhost:5502',
    'http://127.0.0.1:5502',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    /^http:\/\/localhost:\d+$/,
    /^http:\/\/127\.0\.0\.1:\d+$/
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        const allowed = allowedOrigins.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(origin);
            }
            return pattern === origin;
        });
        if (allowed) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            callback(new Error('CORS not allowed for this origin'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: {
        success: false,
        message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection pool
let pool;

async function initializeDatabase() {
    try {
        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'P@ssw0rd',
            database: process.env.DB_NAME || 'university_chatbot',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0
        });

        await pool.getConnection();
        console.log('[SUCCESS] Connected to MySQL database');
        console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
        console.log(`   Database: ${process.env.DB_NAME}`);
        connection.release();
        
        return true;
    } catch (error) {
        console.error('[ERROR] Database connection failed:');
        console.error(`   Error: ${error.message}`);
        console.error('   Please check your database credentials and ensure MySQL is running.');
        
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        } else {
            console.log('   Continuing in development mode without database...');
            return false;
        }
    }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false, 
                message: 'Invalid or expired token' 
            });
        }
        req.user = user;
        next();
    });
};

// Optional authentication middleware (doesn't block if no token)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        req.user = null;
        return next();
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

// Check if query is university-related
function isUniversityRelated(query) {
    const universityKeywords = [
        'admission', 'tuition', 'fee', 'course', 'class', 'register', 'enroll',
        'library', 'housing', 'dorm', 'accommodation', 'financial aid', 'scholarship',
        'deadline', 'application', 'requirement', 'campus', 'faculty', 'professor',
        'schedule', 'calendar', 'exam', 'test', 'grade', 'transcript', 'degree',
        'major', 'minor', 'department', 'college', 'university', 'student',
        'staff', 'admin', 'cafeteria', 'meal plan', 'parking', 'transportation',
        'health', 'clinic', 'counseling', 'career', 'job', 'internship', 'placement',
        'graduate', 'undergraduate', 'semester', 'quarter', 'credit', 'prerequisite',
        'registration'
    ];

    const queryLower = query.toLowerCase();
    return universityKeywords.some(keyword => queryLower.includes(keyword));
}

// ====================================================
// IMPROVED KNOWLEDGE BASE SEARCH – RELEVANCE SCORING
// ====================================================
async function searchKnowledgeBase(query) {
    if (!pool) return null;
    
    try {
        const connection = await pool.getConnection();
        
        // Clean the query (remove stop words, punctuation)
        const stopWords = ['what', 'how', 'where', 'when', 'why', 'is', 'are', 'the', 'a', 'an', 'for', 'to', 'of', 'on', 'in', 'at', 'with', 'by', 'from', 'as', 'be', 'do', 'does', 'did', 'have', 'has', 'had', 'can', 'could', 'will', 'would', 'should', 'may', 'might'];
        const words = query.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(' ')
            .filter(w => w.length > 2 && !stopWords.includes(w));
        
        if (words.length === 0) {
            connection.release();
            return null;
        }
        
        // Build dynamic SQL with scoring
        let conditions = [];
        let scoreTerms = [];
        let params = [];
        
        words.forEach(word => {
            conditions.push('(question LIKE ? OR answer LIKE ? OR keywords LIKE ?)');
            params.push(`%${word}%`, `%${word}%`, `%${word}%`);
            
            // Score: 5 points if word in question, 3 if in keywords, 1 if in answer
            scoreTerms.push(`
                (CASE 
                    WHEN question LIKE ? THEN 5
                    WHEN keywords LIKE ? THEN 3
                    WHEN answer LIKE ? THEN 1
                    ELSE 0
                END)
            `);
            params.push(`%${word}%`, `%${word}%`, `%${word}%`);
        });
        
        // Also add exact phrase match bonus (full query)
        conditions.push('(question LIKE ? OR answer LIKE ? OR keywords LIKE ?)');
        params.push(`%${query}%`, `%${query}%`, `%${query}%`);
        scoreTerms.push(`
            (CASE 
                WHEN question LIKE ? THEN 15
                WHEN keywords LIKE ? THEN 8
                WHEN answer LIKE ? THEN 4
                ELSE 0
            END)
        `);
        params.push(`%${query}%`, `%${query}%`, `%${query}%`);
        
        const sql = `
            SELECT *, 
                (${scoreTerms.join(' + ')}) + priority AS relevance
            FROM knowledge_base 
            WHERE ${conditions.join(' OR ')}
            ORDER BY relevance DESC, LENGTH(answer) ASC
            LIMIT 3
        `;
        
        const [results] = await connection.execute(sql, params);
        connection.release();
        
        if (results.length > 0) {
            console.log(`[SUCCESS] Found ${results.length} results, best relevance: ${results[0].relevance}`);
            return results[0].answer;
        }
        return null;
    } catch (error) {
        console.error('[ERROR] Error searching knowledge base:', error.message);
        return null;
    }
}

// Get AI response from OpenAI
async function getAIResponse(query, context = '') {
    const systemPrompt = `You are a helpful university support assistant. Your role is to provide accurate, helpful information about university services including admissions, courses, housing, financial aid, and student support. 

IMPORTANT GUIDELINES:
1. Only answer questions related to university services and support
2. If asked about non-university topics, politely redirect to university services
3. Provide clear, structured information with bullet points when appropriate
4. Be friendly and professional
5. If you're unsure about specific details, suggest contacting the relevant department
6. Keep responses concise but comprehensive (max 3-4 paragraphs)
7. Use a warm, encouraging tone

${context ? `Previous conversation context:\n${context}` : ''}

Current question: ${query}`;

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
        console.log('[WARNING] OpenAI API key not configured, using fallback responses');
        return getFallbackResponse(query);
    }

    try {
        console.log('[INFO] Calling OpenAI API...');
        
        const response = await client.responses.create({
            model: "gpt-5.4-mini",
            input: `${systemPrompt}`,
        });

        console.log(response.output_text);

        if (response.output_text) {
            console.log('[SUCCESS] OpenAI response received');
            return response.output_text;
        } else {
            throw new Error('Invalid response from OpenAI');
        }

    } catch (error) {
        console.error('[ERROR] OpenAI API error:', error.response?.data?.error?.message || error.message);
        
        // Try Cohere as fallback if configured
        if (process.env.COHERE_API_KEY && process.env.COHERE_API_KEY !== 'your_cohere_api_key_optional') {
            try {
                console.log('[INFO] Trying Cohere API as fallback...');
                
                const cohereResponse = await axios.post(
                    'https://api.cohere.ai/v1/generate',
                    {
                        model: 'command',
                        prompt: `${systemPrompt}\n\nQuestion: ${query}\n\nAnswer:`,
                        max_tokens: 500,
                        temperature: 0.7,
                        stop_sequences: ['\n\n']
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 10000
                    }
                );

                if (cohereResponse.data && cohereResponse.data.generations && cohereResponse.data.generations[0]) {
                    console.log('[SUCCESS] Cohere response received');
                    return cohereResponse.data.generations[0].text;
                }
            } catch (cohereError) {
                console.error('[ERROR] Cohere API error:', cohereError.message);
            }
        }
        
        // Final fallback
        return getFallbackResponse(query);
    }
}

function getFallbackResponse(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('admission') || queryLower.includes('apply')) {
        return 'For admission inquiries, please visit our admissions office or check the university website for detailed requirements and deadlines. The general requirements include: completed application form, official transcripts, letters of recommendation, personal statement, and standardized test scores. Contact admissions@university.edu for specific questions.';
    }
    
    if (queryLower.includes('tuition') || queryLower.includes('fee') || queryLower.includes('cost')) {
        return 'Tuition fees vary by program and student status. Undergraduate tuition ranges from $15,000-$20,000 per semester. Graduate programs range from $18,000-$25,000 per semester. Financial aid, scholarships, and payment plans are available. Please contact the bursar\'s office at (123) 456-7890 or email bursar@university.edu for specific fee information.';
    }
    
    if (queryLower.includes('course') || queryLower.includes('class') || queryLower.includes('register')) {
        return 'Course registration is done through the student portal during designated registration periods. Make sure to: 1) Check your registration appointment time, 2) Clear any holds on your account, 3) Consult with your academic advisor, 4) Have backup courses ready. Contact the Registrar\'s Office at (123) 456-7891 for assistance.';
    }
    
    if (queryLower.includes('housing') || queryLower.includes('dorm') || queryLower.includes('accommodation')) {
        return 'On-campus housing applications are accepted through the housing portal. We offer traditional dormitories, suite-style residences, and apartments. The priority deadline for Fall semester is May 1st. For more information, visit the housing office in Building C or email housing@university.edu.';
    }
    
    if (queryLower.includes('financial aid') || queryLower.includes('scholarship') || queryLower.includes('fafsa')) {
        return 'Financial aid applications are processed through FAFSA (school code: 123456) and the university financial aid office. The priority deadline for Fall semester is March 1st. Aid packages may include grants, scholarships, work-study, and loans. Contact finaid@university.edu or visit Building A, Room 102 for assistance.';
    }
    
    if (queryLower.includes('library')) {
        return 'The library is open Monday-Friday 8 AM - 10 PM, Saturday 10 AM - 6 PM, and Sunday 12 PM - 8 PM. Extended hours during finals week. You can access online databases, research guides, and reserve study rooms through the library website. Contact the reference desk at (123) 456-7894 for research help.';
    }
    
    return 'I understand you\'re asking about university services. For specific information, please contact the relevant department directly or visit our website at www.university.edu. You can also ask me about admissions, tuition, courses, housing, financial aid, library services, or student support.';
}

// Save chat to database
async function saveChatHistory(userId, userMessage, botResponse, category = null) {
    if (!pool || !userId || userId === 'guest') return;
    
    try {
        const connection = await pool.getConnection();
        const sql = `
            INSERT INTO chat_history (user_id, user_message, bot_response, category, timestamp)
            VALUES (?, ?, ?, ?, NOW())
        `;
        
        await connection.execute(sql, [userId, userMessage, botResponse, category]);
        connection.release();
    } catch (error) {
        console.error('[ERROR] Error saving chat history:', error.message);
    }
}

// ==================== API ROUTES ====================

app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'University Chatbot API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: pool ? 'connected' : 'disconnected'
    });
});

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'University Chatbot API',
        endpoints: {
            health: '/api/health',
            chat: '/api/chat',
            login: '/api/auth/login',
            register: '/api/auth/register',
            services: '/api/services'
        },
        documentation: 'See README.md for more information'
    });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, userType = 'student' } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username, email, and password are required' 
            });
        }

        if (!pool) {
            return res.status(503).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        const connection = await pool.getConnection();
        
        try {
            const [existingUsers] = await connection.execute(
                'SELECT id FROM users WHERE username = ? OR email = ?',
                [username, email]
            );

            if (existingUsers.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Username or email already exists' 
                });
            }

            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            const [result] = await connection.execute(
                'INSERT INTO users (username, email, password_hash, user_type) VALUES (?, ?, ?, ?)',
                [username, email, passwordHash, userType]
            );

            const token = jwt.sign(
                { userId: result.insertId, username, userType },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            res.json({
                success: true,
                message: 'Registration successful',
                userId: result.insertId,
                username,
                token
            });
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('[ERROR] Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Registration failed. Please try again.' 
        });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                message: 'Username and password are required' 
            });
        }

        if (!pool) {
            return res.status(503).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        const connection = await pool.getConnection();
        
        try {
            const [users] = await connection.execute(
                'SELECT * FROM users WHERE username = ? OR email = ?',
                [username, username]
            );

            if (users.length === 0) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials' 
                });
            }

            const user = users[0];
            const validPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!validPassword) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Invalid credentials' 
                });
            }

            const token = jwt.sign(
                { userId: user.id, username: user.username, userType: user.user_type },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                userId: user.id,
                username: user.username,
                userType: user.user_type,
                token
            });
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('[ERROR] Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Login failed. Please try again.' 
        });
    }
});

// Chat endpoint
app.post('/api/chat', optionalAuth, async (req, res) => {
    try {
        const { message } = req.body;
        const userId = req.user?.userId || req.body.userId || 1;
        
        if (!message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Message is required' 
            });
        }

        console.log(`[CHAT] Request from ${userId}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`);

        if (!isUniversityRelated(message)) {
            const nonUniResponse = "I'm designed to help with university-related questions. Please ask about admissions, courses, housing, financial aid, or other university services.";
            
            if (userId && userId !== 'guest') {
                await saveChatHistory(userId, message, nonUniResponse, 'off_topic');
            }
            
            return res.json({
                success: true,
                response: nonUniResponse,
                quickActions: [
                    { text: "📝 Admissions", question: "What are the admission requirements?" },
                    { text: "📚 Courses", question: "How do I register for courses?" },
                    { text: "🏠 Housing", question: "What housing options are available?" },
                    { text: "💰 Financial Aid", question: "How do I apply for financial aid?" }
                ]
            });
        }

        let response;
        let source = 'ai';
        
        const kbAnswer = await searchKnowledgeBase(message);
        
        if (kbAnswer) {
            response = kbAnswer;
            source = 'knowledge_base';
            console.log('[INFO] Using knowledge base response');
        } else {
            let context = '';
            if (userId && userId !== 'guest' && pool) {
                try {
                    const connection = await pool.getConnection();
                    const [recentMessages] = await connection.execute(
                        'SELECT user_message, bot_response FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT 3',
                        [userId]
                    );
                    connection.release();
                    
                    if (recentMessages.length > 0) {
                        context = recentMessages.reverse().map(msg => 
                            `User: ${msg.user_message}\nAssistant: ${msg.bot_response}`
                        ).join('\n\n');
                    }
                } catch (error) {
                    console.error('[ERROR] Error getting context:', error.message);
                }
            }
            
            response = await getAIResponse(message, context);
            console.log('[INFO] Using AI-generated response');
        }

        let category = 'general';
        const messageLower = message.toLowerCase();
        
        if (messageLower.includes('admission') || messageLower.includes('apply')) {
            category = 'admissions';
        } else if (messageLower.includes('tuition') || messageLower.includes('fee') || messageLower.includes('cost')) {
            category = 'tuition';
        } else if (messageLower.includes('course') || messageLower.includes('class') || messageLower.includes('register')) {
            category = 'courses';
        } else if (messageLower.includes('housing') || messageLower.includes('dorm') || messageLower.includes('accommodation')) {
            category = 'housing';
        } else if (messageLower.includes('financial') || messageLower.includes('aid') || messageLower.includes('scholarship') || messageLower.includes('fafsa')) {
            category = 'financial_aid';
        } else if (messageLower.includes('library')) {
            category = 'library';
        } else if (messageLower.includes('career') || messageLower.includes('job') || messageLower.includes('internship')) {
            category = 'career';
        }

        if (userId && userId !== 'guest') {
            await saveChatHistory(userId, message, response, category);
        }

        let quickActions = [];
        
        if (category === 'admissions') {
            quickActions = [
                { text: "📅 Application Deadline", question: "When is the application deadline?" },
                { text: "📋 Requirements", question: "What documents are required for admission?" },
                { text: "🌍 International Students", question: "What are the requirements for international students?" }
            ];
        } else if (category === 'courses') {
            quickActions = [
                { text: "📝 Registration Process", question: "How do I register for courses?" },
                { text: "📚 Course Catalog", question: "Where can I find the course catalog?" },
                { text: "✅ Prerequisites", question: "How do I check course prerequisites?" }
            ];
        } else if (category === 'housing') {
            quickActions = [
                { text: "🏠 Application Process", question: "How do I apply for housing?" },
                { text: "💰 Cost", question: "How much does on-campus housing cost?" },
                { text: "🛏️ Amenities", question: "What amenities are included in housing?" }
            ];
        } else if (category === 'financial_aid') {
            quickActions = [
                { text: "📝 FAFSA", question: "How do I fill out the FAFSA?" },
                { text: "🎓 Scholarships", question: "What scholarships are available?" },
                { text: "📅 Deadlines", question: "When are financial aid deadlines?" }
            ];
        } else {
            quickActions = [
                { text: "📝 Admissions", question: "Tell me about admission requirements" },
                { text: "💰 Tuition Fees", question: "What are the tuition fees?" },
                { text: "📚 Course Registration", question: "How do I register for courses?" },
                { text: "🏠 Housing", question: "Tell me about housing options" }
            ];
        }

        res.json({
            success: true,
            response: response,
            source: source,
            quickActions: quickActions
        });

    } catch (error) {
        console.error('[ERROR] Chat error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'An error occurred while processing your request',
            response: "I'm having trouble processing your request. Please try again or contact the university support desk."
        });
    }
});

// Get chat history
app.get('/api/chat/history', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { limit = 50 } = req.query;

        if (!pool) {
            return res.status(503).json({
                success: false,
                message: 'Database connection not available'
            });
        }

        const connection = await pool.getConnection();
        
        try {
            const [history] = await connection.execute(
                'SELECT user_message, bot_response, category, timestamp FROM chat_history WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?',
                [userId, parseInt(limit)]
            );

            res.json({
                success: true,
                history: history.reverse()
            });
        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('[ERROR] History error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to retrieve chat history' 
        });
    }
});

// University services information
app.get('/api/services', (req, res) => {
    const services = {
        admissions: {
            title: "Admissions Office",
            description: "Handles undergraduate and graduate admissions",
            contact: "admissions@university.edu | (123) 456-7890",
            location: "Building A, Room 101",
            hours: "Mon-Fri: 9 AM - 5 PM",
            website: "https://www.university.edu/admissions"
        },
        registrar: {
            title: "Registrar's Office",
            description: "Course registration, transcripts, and academic records",
            contact: "registrar@university.edu | (123) 456-7891",
            location: "Building B, Room 201",
            hours: "Mon-Fri: 8:30 AM - 4:30 PM",
            website: "https://www.university.edu/registrar"
        },
        financial_aid: {
            title: "Financial Aid Office",
            description: "Scholarships, grants, loans, and work-study programs",
            contact: "finaid@university.edu | (123) 456-7892",
            location: "Building C, Room 102",
            hours: "Mon-Fri: 9 AM - 5 PM",
            website: "https://www.university.edu/financial-aid"
        },
        housing: {
            title: "Housing Services",
            description: "On-campus accommodation and residential life",
            contact: "housing@university.edu | (123) 456-7893",
            location: "Building D, Room 301",
            hours: "Mon-Fri: 10 AM - 6 PM",
            website: "https://www.university.edu/housing"
        },
        library: {
            title: "University Library",
            description: "Research assistance, study spaces, and digital resources",
            contact: "library@university.edu | (123) 456-7894",
            location: "Library Building",
            hours: "Mon-Fri: 8 AM - 10 PM, Sat-Sun: 10 AM - 8 PM",
            website: "https://www.university.edu/library"
        },
        career_services: {
            title: "Career Services",
            description: "Job placement, internships, resume workshops, and career counseling",
            contact: "career@university.edu | (123) 456-7895",
            location: "Building E, Room 101",
            hours: "Mon-Fri: 9 AM - 5 PM",
            website: "https://www.university.edu/career"
        }
    };

    res.json({
        success: true,
        services
    });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    const frontendPath = path.join(__dirname, '../Frontend');
    app.use(express.static(frontendPath));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(frontendPath, 'index.html'));
    });
}

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('[ERROR] Unhandled error:', err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ 
        success: false, 
        message: `Endpoint not found: ${req.method} ${req.path}` 
    });
});

// Start server
async function startServer() {
    console.log('\n[START] Starting University Chatbot Server...\n');
    
    await initializeDatabase();
    
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        console.log('\n[SUCCESS] Server is ready!');
        console.log(`   URL: http://localhost:${PORT}`);
        console.log(`   API Base: http://localhost:${PORT}/api`);
        console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`   Started: ${new Date().toLocaleString()}\n`);
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
        console.log('\n\n[SHUTDOWN] Shutting down server...');
        if (pool) {
            await pool.end();
            console.log('[INFO] Database connections closed');
        }
        server.close(() => {
            console.log('[INFO] Server stopped');
            process.exit(0);
        });
    });
}

process.on('uncaughtException', (error) => {
    console.error('[FATAL] Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch(error => {
    console.error('[FATAL] Failed to start server:', error);
    process.exit(1);
});
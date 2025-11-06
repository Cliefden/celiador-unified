import cors from 'cors';
// CORS configuration - allow production domains
const corsOptions = {
    origin: [
        'https://celiador.ai',
        'https://www.celiador.ai',
        'http://localhost:3000',
        'http://localhost:3001',
        /.*\.vercel\.app$/
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    optionsSuccessStatus: 200
};
// Request logging middleware
const requestLogger = (req, res, next) => {
    const origin = req.headers.origin;
    console.log(`🌐 [REQUEST] ${req.method} ${req.path} from origin: ${origin || 'no origin'}`);
    // Add error handling for better debugging
    res.on('finish', () => {
        if (res.statusCode >= 400) {
            console.log(`❌ [ERROR] ${req.method} ${req.path} - Status: ${res.statusCode}`);
        }
    });
    next();
};
export { corsOptions, requestLogger };
export const corsMiddleware = cors(corsOptions);

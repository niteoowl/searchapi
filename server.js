const express = require('express');
const axios = require('axios');
const cors = require('cors');
const NodeCache = require('node-cache');

const app = express();
const PORT = 3000;

// 캐시 유효시간: 3600초 (1시간)
const myCache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });

// 내 프론트엔드 앱이 이 API에 접근할 수 있도록 CORS 허용
app.use(cors());

/**
 * @route   GET /api/autocomplete
 * @desc    구글 자동완성 API 우회 및 캐싱 엔드포인트
 * @query   q (검색 키워드)
 */
app.get('/api/autocomplete', async (req, res) => {
    try {
        const query = req.query.q;
        
        if (!query || !query.trim()) {
            return res.json([]);
        }

        const trimmedQuery = query.trim();

        // 1. 캐시 확인
        const cachedData = myCache.get(trimmedQuery);
        if (cachedData) {
            console.log(`[Cache Hit] '${trimmedQuery}'`);
            return res.json(cachedData);
        }

        // 2. 구글 API 호출 (서버 간 통신으로 구글측 CORS 우회)
        console.log(`[Cache Miss] '${trimmedQuery}' -> Google API`);
        const googleUrl = `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(trimmedQuery)}`;
        
        const response = await axios.get(googleUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        // 구글 데이터 가공 (결과 배열만 추출)
        const autocompleteResults = response.data[1] || [];

        // 3. 캐시 저장
        myCache.set(trimmedQuery, autocompleteResults);

        // 4. 응답
        res.json(autocompleteResults);

    } catch (error) {
        console.error('API Error:', error.message);
        // 에러 발생 시 서비스가 중단되지 않도록 빈 배열로 Fallback 처리
        res.status(500).json({ error: 'Internal Server Error', data: [] });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Autocomplete Proxy API running on http://localhost:${PORT}`);
});

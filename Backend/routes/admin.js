import express from 'express';
import { runIngestion } from '../scraper.js';

const router = express.Router();

/**
 * @route POST /api/admin/scrape
 * @desc Manually trigger a website scrape to refresh the AI context
 * @access Private/Admin (For focus, we're keeping it simple for now)
 */
router.all('/scrape', async (req, res) => {
    try {
        const { urls } = req.body || {}; // Optional: provide specific URLs to scrape
        console.log('--- ADMIN: Manual Scrape Triggered ---');
        
        // Use custom URLs if provided, otherwise the default ones in scraper.js
        const result = await runIngestion(urls || null);
        
        res.status(200).json({
            success: true,
            message: 'Inspiration and extraction completed successfully.',
            chunksSaved: result
        });
    } catch (error) {
        console.error('Admin Scrape Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to complete data ingestion.',
            error: error.message
        });
    }
});

/**
 * @route GET /api/admin/stats
 * @desc Check database status and chunk count
 */
router.get('/stats', async (req, res) => {
    try {
        const count = await Chunk.countDocuments();
        const sample = await Chunk.findOne().select('text sourceUrl');
        
        res.status(200).json({
            success: true,
            totalChunks: count,
            sampleSnippet: sample ? sample.text.substring(0, 100) : 'No data found',
            source: sample ? sample.sourceUrl : 'N/A'
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;

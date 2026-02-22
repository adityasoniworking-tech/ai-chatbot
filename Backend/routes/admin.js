import express from 'express';
import { runIngestion } from '../scraper.js';

const router = express.Router();

/**
 * @route POST /api/admin/scrape
 * @desc Manually trigger a website scrape to refresh the AI context
 * @access Private/Admin (For focus, we're keeping it simple for now)
 */
router.post('/scrape', async (req, res) => {
    try {
        const { urls } = req.body; // Optional: provide specific URLs to scrape
        console.log('--- ADMIN: Manual Scrape Triggered ---');
        
        // Use custom URLs if provided, otherwise the default ones in scraper.js
        const result = await runIngestion(urls || null);
        
        res.status(200).json({
            success: true,
            message: 'Inspiration and extraction completed successfully.',
            chunksSaved: result.length
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

export default router;

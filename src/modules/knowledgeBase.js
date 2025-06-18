/**
 * Knowledge Base Module
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const vectorService = require('../services/vectorService');

const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.pdf', '.txt', '.doc', '.docx'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, TXT, DOC, and DOCX files are allowed'));
        }
    }
});

router.post('/upload', upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { businessId, businessName } = req.body;
        if (!businessId || !businessName) {
            return res.status(400).json({ error: 'Business ID and name are required' });
        }

        const filePath = req.file.path;
        let content = '';

        if (path.extname(req.file.originalname).toLowerCase() === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdfParse(dataBuffer);
            content = data.text;
        } else if (path.extname(req.file.originalname).toLowerCase() === '.txt') {
            content = fs.readFileSync(filePath, 'utf8');
        }

        await vectorService.storeDocument({
            businessId,
            businessName,
            filename: req.file.originalname,
            content,
            metadata: {
                uploadDate: new Date(),
                fileType: path.extname(req.file.originalname)
            }
        });

        fs.unlinkSync(filePath);

        res.json({ 
            message: 'Document uploaded and processed successfully',
            filename: req.file.originalname
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process document' });
    }
});

router.get('/business/:businessId/documents', async (req, res) => {
    try {
        const { businessId } = req.params;
        const documents = await vectorService.getBusinessDocuments(businessId);
        res.json({ documents });
    } catch (error) {
        console.error('Fetch documents error:', error);
        res.status(500).json({ error: 'Failed to fetch documents' });
    }
});

router.post('/search', async (req, res) => {
    try {
        const { query, businessId } = req.body;
        
        if (!query || !businessId) {
            return res.status(400).json({ error: 'Query and business ID are required' });
        }

        const results = await vectorService.searchSimilar(query, businessId);
        res.json({ results });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
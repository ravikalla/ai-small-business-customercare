/**
 * Vector Database Service
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const { OpenAI } = require('openai');

class VectorService {
    constructor() {
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY
        });
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.indexName = process.env.PINECONE_INDEX_NAME || 'small-business-kb';
    }

    async initialize() {
        try {
            this.index = this.pinecone.index(this.indexName);
            console.log('Vector service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize vector service:', error);
        }
    }

    async generateEmbedding(text) {
        try {
            const response = await this.openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: text
            });
            return response.data[0].embedding;
        } catch (error) {
            console.error('Error generating embedding:', error);
            throw error;
        }
    }

    async storeDocument({ businessId, businessName, filename, content, metadata }) {
        try {
            if (!this.index) await this.initialize();

            const chunks = this.chunkText(content, 1000);
            const vectors = [];

            for (let i = 0; i < chunks.length; i++) {
                const embedding = await this.generateEmbedding(chunks[i]);
                vectors.push({
                    id: `${businessId}-${filename}-${i}`,
                    values: embedding,
                    metadata: {
                        businessId,
                        businessName,
                        filename,
                        content: chunks[i],
                        chunkIndex: i,
                        ...metadata
                    }
                });
            }

            await this.index.upsert(vectors);
            console.log(`Stored ${vectors.length} chunks for ${filename}`);
        } catch (error) {
            console.error('Error storing document:', error);
            throw error;
        }
    }

    async searchSimilar(query, businessId, topK = 5) {
        try {
            if (!this.index) await this.initialize();

            const queryEmbedding = await this.generateEmbedding(query);
            
            const searchResponse = await this.index.query({
                vector: queryEmbedding,
                topK,
                filter: { businessId },
                includeMetadata: true
            });

            return searchResponse.matches.map(match => ({
                content: match.metadata.content,
                score: match.score,
                filename: match.metadata.filename
            }));
        } catch (error) {
            console.error('Error searching vectors:', error);
            throw error;
        }
    }

    async getBusinessDocuments(businessId) {
        try {
            if (!this.index) await this.initialize();

            const response = await this.index.query({
                vector: new Array(1536).fill(0),
                topK: 1000,
                filter: { businessId },
                includeMetadata: true
            });

            const uniqueFiles = new Set();
            response.matches.forEach(match => {
                if (match.metadata.filename) {
                    uniqueFiles.add(match.metadata.filename);
                }
            });

            return Array.from(uniqueFiles);
        } catch (error) {
            console.error('Error fetching business documents:', error);
            throw error;
        }
    }

    chunkText(text, maxChunkSize) {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const chunks = [];
        let currentChunk = '';

        for (const sentence of sentences) {
            if (currentChunk.length + sentence.length <= maxChunkSize) {
                currentChunk += sentence + '. ';
            } else {
                if (currentChunk.trim()) {
                    chunks.push(currentChunk.trim());
                }
                currentChunk = sentence + '. ';
            }
        }

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }
}

module.exports = new VectorService();
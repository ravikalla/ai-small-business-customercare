/**
 * AI Response Generation Service
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

const { OpenAI } = require('openai');
const vectorService = require('./vectorService');

class AIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async generateResponse(query, businessId) {
        try {
            const relevantDocs = await vectorService.searchSimilar(query, businessId, 3);
            
            if (relevantDocs.length === 0) {
                return "I don't have specific information about that in the business knowledge base. Please contact the business directly or try asking a different question.";
            }

            const context = relevantDocs
                .map(doc => doc.content)
                .join('\n\n');

            const prompt = `You are a helpful AI assistant for a small business. Based on the following information from the business's knowledge base, please answer the customer's question in a friendly and helpful manner.

Context from business knowledge base:
${context}

Customer question: ${query}

Instructions:
- Only use information from the provided context
- If the context doesn't contain relevant information, politely say so
- Be friendly and professional
- Keep responses concise but helpful
- If appropriate, suggest contacting the business directly for more details

Response:`;

            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful customer service AI for a small business.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 300,
                temperature: 0.7
            });

            return completion.choices[0].message.content.trim();

        } catch (error) {
            console.error('Error generating AI response:', error);
            throw new Error('Failed to generate response');
        }
    }

    async summarizeDocument(content) {
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful AI that summarizes business documents.' },
                    { role: 'user', content: `Please provide a brief summary of the following document:\n\n${content}` }
                ],
                max_tokens: 150,
                temperature: 0.5
            });

            return completion.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error summarizing document:', error);
            throw new Error('Failed to summarize document');
        }
    }
}

module.exports = new AIService();
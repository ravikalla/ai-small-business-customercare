/**
 * Small Business Chatbot
 * Author: Ravi Kalla <ravi2523096+sbc@gmail.com>
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const knowledgeBaseModule = require('./modules/knowledgeBase');
const whatsappModule = require('./modules/whatsapp');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/knowledge', knowledgeBaseModule);

app.get('/', (req, res) => {
    res.json({ message: 'Small Business Chatbot API is running!' });
});

whatsappModule.initialize();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
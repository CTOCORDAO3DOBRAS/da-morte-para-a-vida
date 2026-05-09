const express = require('express');
const QRCode = require('qrcode');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // A URL que o QR code vai apontar. Pode vir de uma variável de ambiente, ou apontar para a Vercel.
    const url = process.env.APP_URL || 'https://da-morte-para-a-vida.vercel.app';
    
    // Gerar QR Code como Data URI
    const qrCodeImage = await QRCode.toDataURL(url);
    
    res.json({ qrCode: qrCodeImage });
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    res.status(500).json({ error: 'Erro ao gerar QR Code' });
  }
});

module.exports = router;

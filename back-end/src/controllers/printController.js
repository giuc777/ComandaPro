export function createPrintController(printerService) {
    return {

        async printReceipt(req, res) {
            if (!printerService.isEnabled()) {
                return res.status(501).json({ error: 'Impresora deshabilitada' });
            }
            try {
                const { id } = req.params;
                await printerService.printReceipt(id);
                res.json({ message: 'Recibo enviado a impresora' });
            } catch (error) {
                console.error('Error printing receipt:', error.message);
                res.status(500).json({ error: `Error de impresion: ${error.message}` });
            }
        },

        async printTest(req, res) {
            if (!printerService.isEnabled()) {
                return res.status(501).json({ error: 'Impresora deshabilitada' });
            }
            try {
                await printerService.printTest();
                res.json({ message: 'Prueba de impresion enviada' });
            } catch (error) {
                console.error('Error printing test:', error.message);
                res.status(500).json({ error: `Error de impresion: ${error.message}` });
            }
        },

        async getStatus(req, res) {
            res.json(printerService.getStatus());
        },
    };
}

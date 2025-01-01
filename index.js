const puppeteer = require('puppeteer');
const express = require('express')
const app = express();
require('dotenv').config()
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: 'API' });
});

// app.post('/linha', (req, res) => {
//     const { ponto } = req.body;
//     console.log("requisição da linha: ", ponto);
//     if (!ponto) return res.status(400).json({ error: 'Informe a linha!' });

//     try {
//         (async () => {
//             const browser = await puppeteer.launch({ headless: true });
//             const page_1 = await browser.newPage();

//             await page_1.goto('https://m.rmtcgoiania.com.br/');

//             const elements = await page_1.$$('.action-icon');
//             await elements[1].click();

//             /////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//             const currentPage_2 = await browser.pages();
//             const page_2 = currentPage_2[currentPage_2.length - 1];

//             // Criando o timeout de 10 segundos
//             const navigationPromise = page_2.waitForNavigation({ waitUntil: 'domcontentloaded' });
//             const timeoutPromise = new Promise((_, reject) =>
//                 setTimeout(() => reject(new Error('Timeout: Não foi possível acessar a linha')), 3500)
//             );

//             try {
//                 await Promise.race([navigationPromise, timeoutPromise]);
//             } catch (error) {
//                 console.error('Erro ao navegar para a segunda página:', error);
//                 return res.status(500).json({ error: error.message });
//             }

//             await page_2.type('#txtNumeroPonto', ponto);

//             await page_2.waitForSelector('[name="btnPesquisarPedLinha"]');
//             await page_2.click('[name="btnPesquisarPedLinha"]');

//             /////////////////////////////////////////////////////////////////////////////////////////////////////////////

//             const currentPage_3 = await browser.pages();
//             const page_3 = currentPage_3[currentPage_3.length - 1];

//             try {
//                 const navigationPromise2 = page_3.waitForNavigation({ waitUntil: 'domcontentloaded' });
//                 await Promise.race([navigationPromise2, timeoutPromise]);
//             } catch (error) {
//                 console.error('Erro ao navegar para a terceira página:', error);
//                 return res.status(500).json({ error: 'Ponto não encontrado' }); a
//             }

//             const divTexts = await page_3.evaluate(() => {
//                 return Array.from(document.querySelectorAll('td')).map(td => td.textContent.trim());
//             });

//             let endl = 0;
//             let linhas = [];
//             let linha = {
//                 Linha: '',
//                 Destino: '',
//                 Proximo: '',
//                 Segundo: ''
//             };

//             for (let index = 3; index < divTexts.length; index++) {
//                 if (endl === 0) {
//                     endl++;
//                     linha.Linha = divTexts[index];
//                 } else if (endl === 1) {
//                     endl++;
//                     linha.Destino = divTexts[index];
//                 } else if (endl === 2) {
//                     endl++;
//                     linha.Proximo = divTexts[index];
//                 } else if (endl === 3) {
//                     endl = 0;
//                     linha.Segundo = divTexts[index];
//                     linhas.push({ ...linha });
//                 }
//             }

//             if (linhas.length === 0) {
//                 return res.status(404).json({ error: 'Linhas não encontrada' });
//             }

//             console.log(linhas);
//             res.json(linhas);
//             await browser.close();
//         })();
//     } catch (error) {
//         console.error("Erro ao processar a requisição:", error);
//         res.status(500).json({ error: 'Erro interno ao processar a requisição' });
//     }
// });


app.post('/linha', async (req, res) => {
    const { ponto } = req.body;
    console.log(ponto)
    if (!ponto || !(/^[0-9]+$/.test(ponto))) {
        return res.status(400).send('Informe o ponto correto.');
    }


    try {
        const browser = await puppeteer.launch({
            headless: true
        });

        const page_1 = await browser.newPage();
        await page_1.goto('https://m.rmtcgoiania.com.br/');

        const elements = await page_1.$$('.action-icon');
        await elements[1].click();

        const currentPage_2 = await browser.pages();
        const page_2 = currentPage_2[currentPage_2.length - 1];

        const navigationPromise = page_2.waitForNavigation({ waitUntil: 'domcontentloaded' });
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout: Não foi possível acessar a linha')), 3500)
        );

        try {
            await Promise.race([navigationPromise, timeoutPromise]);
        } catch (error) {
            await browser.close();
            return res.status(404).send('❌Ponto não encontrado');
        }

        await page_2.type('#txtNumeroPonto', ponto);
        await page_2.waitForSelector('[name="btnPesquisarPedLinha"]');
        await page_2.click('[name="btnPesquisarPedLinha"]');

        const currentPage_3 = await browser.pages();
        const page_3 = currentPage_3[currentPage_3.length - 1];

        try {
            const navigationPromise2 = page_3.waitForNavigation({ waitUntil: 'domcontentloaded' });
            await Promise.race([navigationPromise2, timeoutPromise]);
        } catch (error) {
            await browser.close();
            return res.status(404).send('❌Ponto não encontrado');
        }

        const divTexts = await page_3.evaluate(() => {
            return Array.from(document.querySelectorAll('td')).map(td => td.textContent.trim());
        });

        let endl = 0;
        let linhas = [];
        let linha = {
            Linha: '',
            Destino: '',
            Proximo: '',
            Segundo: ''
        };

        for (let index = 3; index < divTexts.length; index++) {
            if (endl === 0) {
                endl++;
                linha.Linha = divTexts[index];
            } else if (endl === 1) {
                endl++;
                linha.Destino = divTexts[index];
            } else if (endl === 2) {
                endl++;
                linha.Proximo = divTexts[index];
            } else if (endl === 3) {
                endl = 0;
                linha.Segundo = divTexts[index];
                linhas.push({ ...linha });
            }
        }

        await browser.close();

        if (linhas.length === 0) {
            return res.status(404).send('❌Linhas não encontradas');
        }

        const corpo = linhas.map(linha =>
            `🚌Linha: ${linha.Linha}\n🚩Destino: ${linha.Destino}\n⏳Proximo: ${linha.Proximo}\n🔁Segundo: ${linha.Segundo}\n`
        ).join('\n');

        res.status(200).send(corpo);

    } catch (error) {
        console.error('Erro ao processar a requisição:', error);
        res.status(500).send('Erro interno ao processar a requisição');
    }
});



const PORT = process.env.PORT

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta: ${PORT}`);
});


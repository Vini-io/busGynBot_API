import chromium from 'chrome-aws-lambda';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        const { ponto } = req.body;
        console.log(ponto);

        if (!ponto || !(/^[0-9]+$/.test(ponto))) {
            return res.status(400).send('Informe o ponto correto.');
        }

        try {
            const browser = await chromium.puppeteer.launch({
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath: await chromium.executablePath,
                headless: chromium.headless,
            });

            const page = await browser.newPage();
            await page.goto('https://m.rmtcgoiania.com.br/');

            const elements = await page.$$('.action-icon');
            await elements[1].click();

            const currentPage = await browser.pages();
            const page2 = currentPage[currentPage.length - 1];

            const navigationPromise = page2.waitForNavigation({ waitUntil: 'domcontentloaded' });
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout: Não foi possível acessar a linha')), 3500)
            );

            await Promise.race([navigationPromise, timeoutPromise]);

            await page2.type('#txtNumeroPonto', ponto);
            await page2.waitForSelector('[name="btnPesquisarPedLinha"]');
            await page2.click('[name="btnPesquisarPedLinha"]');

            const currentPage3 = await browser.pages();
            const page3 = currentPage3[currentPage3.length - 1];

            const navigationPromise2 = page3.waitForNavigation({ waitUntil: 'domcontentloaded' });
            await Promise.race([navigationPromise2, timeoutPromise]);

            const divTexts = await page3.evaluate(() => {
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

            if (linhas.length === 0) {
                return res.status(404).send('❌Linhas não encontradas');
            }

            const corpo = linhas.map(linha =>
                `🚌Linha: ${linha.Linha}\n🚩Destino: ${linha.Destino}\n⏳Proximo: ${linha.Proximo}\n🔁Segundo: ${linha.Segundo}\n`
            ).join('\n');

            console.log(corpo);
            res.status(200).send(corpo);

            await browser.close();
        } catch (error) {
            console.error('Erro ao processar a requisição:', error);
            res.status(500).send('Erro interno ao processar a requisição');
        }
    } else {
        res.status(405).send('Método não permitido');
    }
}

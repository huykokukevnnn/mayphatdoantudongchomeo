const { Jimp, rgbaToInt, intToRGBA } = require('jimp');
const fs = require('fs');

async function processSprites() {
    let newSprites = {};

    function colorDist(c1, c2) {
        return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
    }

    async function makeTransparent(img) {
        let bg = intToRGBA(img.getPixelColor(0,0));
        img.scan((x, y, idx) => {
            let p = intToRGBA(img.getPixelColor(x,y));
            if (colorDist(p, bg) < 20 || (p.g > 130 && p.r < 160 && p.b < 160)) {
                img.setPixelColor(0, x, y);
            }
        });
        return img;
    }

    // 1. Siamese
    let img = await Jimp.read('original_siamese.png');
    img = await makeTransparent(img);
    await img.write('processed_siamese.png');
    newSprites.siamese = await img.getBase64('image/png');
    console.log('Siamese done');

    // 2. British Shorthair
    img = await Jimp.read('original_british.png');
    img = await makeTransparent(img);
    let ch = img.height / 4;
    let cw = img.width / 3;
    // Copy row 0 to row 3
    for (let c=0; c<3; c++) {
        for (let x=0; x<cw; x++) {
            for (let y=0; y<ch; y++) {
                let p = img.getPixelColor(c*cw + x, y);
                img.setPixelColor(p, c*cw + x, y + ch*3);
            }
        }
    }
    await img.write('processed_british.png');
    newSprites.british = await img.getBase64('image/png');
    console.log('British done');

    // 3. Tabby (from Calico)
    img = await Jimp.read('original_calico.png');
    img = await makeTransparent(img);
    // Recolor Calico (black, white, brown) to Orange Tabby (orange, yellow, dark orange)
    img.scan((x, y, idx) => {
        let p = intToRGBA(img.getPixelColor(x,y));
        if (p.a > 0) {
            // Very basic recolor: map grayscale-ish colors to orange
            let avg = (p.r + p.g + p.b) / 3;
            let nr = Math.min(255, avg + 100);
            let ng = Math.min(255, avg + 50);
            let nb = Math.min(255, avg);
            
            // If it's a dark color (outline or black patch), make it dark orange
            if (avg < 80) {
                nr = 150; ng = 80; nb = 20;
            } else if (avg > 200) {
                // If it's white patch, make it light orange/yellow
                nr = 255; ng = 200; nb = 100;
            } else {
                // Mid tones
                nr = 220; ng = 130; nb = 40;
            }
            img.setPixelColor(rgbaToInt(nr, ng, nb, p.a), x, y);
        }
    });
    await img.write('processed_tabby.png');
    newSprites.tabby = await img.getBase64('image/png');
    console.log('Tabby done');

    // Process others for completeness
    for (let name of ['calico', 'black', 'rabbit', 'bear', 'sphynx']) {
        let img = await Jimp.read('original_' + name + '.png');
        img = await makeTransparent(img);
        newSprites[name] = await img.getBase64('image/png');
        console.log(name + ' done');
    }

    // Write to sprites.js
    let content = fs.readFileSync('assets/sprites.js', 'utf8');
    for (let k in newSprites) {
        let varName = 'rawSprite' + k.charAt(0).toUpperCase() + k.slice(1);
        let regex = new RegExp('const ' + varName + ' = \\\'[^\\\']*\\\'', 'g');
        if (content.match(regex)) {
            content = content.replace(regex, "const " + varName + " = '" + newSprites[k] + "'");
        } else {
            content += "\\nconst " + varName + " = '" + newSprites[k] + "';";
        }
    }
    fs.writeFileSync('assets/sprites.js', content);
    console.log('sprites.js updated');
}

processSprites().catch(console.error);

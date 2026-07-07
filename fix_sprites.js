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
            // Transparent if very close to background color or green screen
            if (colorDist(p, bg) < 20 || (p.g > 130 && p.r < 160 && p.b < 160)) {
                img.setPixelColor(0, x, y);
            }
        });
        return img;
    }

    // 1. Siamese
    let img = await Jimp.read('original_siamese.png');
    img = await makeTransparent(img);
    newSprites.siamese = await img.getBase64('image/png');
    console.log('Siamese done');

    // 2. Sphynx
    img = await Jimp.read('original_sphynx.png');
    img = await makeTransparent(img);
    
    // Sphynx is a special case (needs frame realignment as seen in old processTransparent logic)
    // We will apply the same realignment here so we don't need it in HTML
    const frameW = img.width / 3;
    const frameH = img.height / 4;
    let alignedImg = img.clone();
    alignedImg.scan(0, 0, alignedImg.width, alignedImg.height, function(x, y, idx) {
        this.setPixelColor(0, x, y); // clear to transparent
    });
    
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 3; c++) {
            const sx = c * frameW;
            const sy = r * frameH;
            
            let minX = frameW, maxX = 0;
            img.scan(sx, sy, frameW, frameH, function(x, y, idx) {
                let p = intToRGBA(this.getPixelColor(x,y));
                if (p.a > 10) {
                    let localX = x - sx;
                    if (localX < minX) minX = localX;
                    if (localX > maxX) maxX = localX;
                }
            });
            
            let shiftX = 0;
            if (minX <= maxX) {
                let centerX = (minX + maxX) / 2;
                shiftX = Math.floor((frameW / 2) - centerX);
            }
            
            // Blit frame to new position
            alignedImg.blit(img, sx + shiftX, sy, sx, sy, frameW, frameH);
        }
    }
    
    newSprites.sphynx = await alignedImg.getBase64('image/png');
    console.log('Sphynx done');

    // 3. Black
    img = await Jimp.read('original_black.png');
    img = await makeTransparent(img);
    newSprites.black = await img.getBase64('image/png');
    console.log('Black done');

    // 4. Calico
    img = await Jimp.read('original_calico.png');
    img = await makeTransparent(img);
    newSprites.calico = await img.getBase64('image/png');
    console.log('Calico done');

    // 5. Persian (from British) - Recolor to white/fluffy
    img = await Jimp.read('original_british.png');
    img = await makeTransparent(img);
    
    // Copy row 0 to row 3 (fixing British up animation)
    let ch = img.height / 4;
    let cw = img.width / 3;
    for (let c=0; c<3; c++) {
        for (let x=0; x<cw; x++) {
            for (let y=0; y<ch; y++) {
                let p = img.getPixelColor(c*cw + x, y);
                img.setPixelColor(p, c*cw + x, y + ch*3);
            }
        }
    }
    
    // Recolor grey to white for Persian
    img.scan((x, y, idx) => {
        let p = intToRGBA(img.getPixelColor(x,y));
        if (p.a > 0) {
            let avg = (p.r + p.g + p.b) / 3;
            // Make everything lighter to simulate a white persian
            let nr = Math.min(255, p.r + 80);
            let ng = Math.min(255, p.g + 80);
            let nb = Math.min(255, p.b + 80);
            
            if (avg < 80) { // keep dark outlines
                nr = p.r; ng = p.g; nb = p.b;
            }
            img.setPixelColor(rgbaToInt(nr, ng, nb, p.a), x, y);
        }
    });
    newSprites.persian = await img.getBase64('image/png');
    console.log('Persian done');

    // 6. Tabby (from Calico) - Recolor to GREY Tabby
    img = await Jimp.read('original_calico.png');
    img = await makeTransparent(img);
    
    img.scan((x, y, idx) => {
        let p = intToRGBA(img.getPixelColor(x,y));
        if (p.a > 0) {
            let avg = (p.r + p.g + p.b) / 3;
            
            let nr, ng, nb;
            if (avg < 80) {
                // Outlines/dark stripes - keep dark grey
                nr = 60; ng = 60; nb = 60;
            } else if (avg > 200) {
                // White patches - light grey
                nr = 200; ng = 200; nb = 200;
            } else {
                // Mid tones (orange/brown originally) -> turn to mid grey
                nr = 140; ng = 140; nb = 140;
            }
            img.setPixelColor(rgbaToInt(nr, ng, nb, p.a), x, y);
        }
    });
    newSprites.tabby = await img.getBase64('image/png');
    console.log('Tabby done');


    // Write to sprites.js
    console.log('Writing to sprites.js...');
    let content = '/* Auto-generated sprites.js from original perfectly aligned files */\n\n';
    const cats = ['siamese', 'sphynx', 'persian', 'tabby', 'black', 'calico'];
    for (let k of cats) {
        let varName = 'rawSprite' + k.charAt(0).toUpperCase() + k.slice(1);
        content += "const " + varName + " = '" + newSprites[k] + "';\n\n";
    }
    fs.writeFileSync('assets/sprites.js', content);
    console.log('sprites.js updated successfully!');
}

processSprites().catch(console.error);

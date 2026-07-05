const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const fs = require('fs');

async function run() {
    const content = fs.readFileSync('assets/sprites.js', 'utf8');
    let newSprites = {};

    // 1. Fix Siamese Grid
    let siamese = await Jimp.read('original_siamese.png');
    siamese.scan((x, y, idx) => {
        let p = intToRGBA(siamese.getPixelColor(x,y));
        // Remove the green background
        if (p.g > p.r + 20 && p.g > p.b + 20) {
            siamese.setPixelColor(0, x, y);
        } else if (p.g > 100 && p.r < 180 && p.b < 180) { 
            siamese.setPixelColor(0, x, y);
        }
        // Remove dark green grid lines
        if (p.r < 50 && p.g < 50 && p.b < 50 && p.g >= p.r && p.g >= p.b) {
            siamese.setPixelColor(0, x, y);
        }
    });
    
    // Swap row 1 and row 2 for Siamese (because earlier we swapped it, wait! Did we?)
    // In my previous `fix.js`, I swapped Row 2 and Row 3.
    // If I re-read from `original_siamese.png`, it's not swapped yet! So I MUST swap it again!
    let ch = siamese.height / 4;
    for (let x=0; x<siamese.width; x++) {
        for (let y=0; y<ch; y++) {
            let r1_y = ch * 1 + y; // Row 2
            let r2_y = ch * 2 + y; // Row 3
            let p1 = siamese.getPixelColor(x, r1_y);
            let p2 = siamese.getPixelColor(x, r2_y);
            siamese.setPixelColor(p2, x, r1_y);
            siamese.setPixelColor(p1, x, r2_y);
        }
    }
    newSprites.siamese = await siamese.getBase64('image/png');

    // 2. Fix Sphynx
    let sphynx = await Jimp.read('original_sphynx.png');
    // Sphynx background is green:
    sphynx.scan((x, y, idx) => {
        let p = intToRGBA(sphynx.getPixelColor(x,y));
        if (p.g > 130 && p.r < 160 && p.b < 160) {
            sphynx.setPixelColor(0, x, y);
        }
    });

    // Flip Row 2 horizontally so it faces Left
    let cw = sphynx.width / 3; // 3 frames per row
    let ch2 = sphynx.height / 4; // 4 rows
    for (let f = 0; f < 3; f++) { // For each frame in row 2
        let startX = f * cw;
        for (let x = 0; x < cw / 2; x++) {
            for (let y = 0; y < ch2; y++) {
                let leftX = startX + x;
                let rightX = startX + cw - 1 - x;
                let py = ch2 * 1 + y; // Row 2
                
                let pLeft = sphynx.getPixelColor(leftX, py);
                let pRight = sphynx.getPixelColor(rightX, py);
                sphynx.setPixelColor(pRight, leftX, py);
                sphynx.setPixelColor(pLeft, rightX, py);
            }
        }
    }

    // Load Calico to generate Up/Down frames for Sphynx
    let calico = await Jimp.read('original_calico.png');
    // Pink color: 255, 166, 158
    calico.scan((x, y, idx) => {
        let p = intToRGBA(calico.getPixelColor(x,y));
        // Remove calico background
        if (p.g > 200 && p.b < 100 && p.r < 150) {
            calico.setPixelColor(0, x, y);
            return;
        }
        
        // If it's not transparent, tint it pink!
        if (p.a > 0) {
            // Keep lightness but apply pink hue
            let avg = (p.r + p.g + p.b) / 3;
            // Dark outlines stay dark
            if (avg < 50) return; 
            
            let r = Math.min(255, avg * 1.5); // Boost red
            let g = avg; 
            let b = avg; 
            
            // Adjust to pink
            r = (r + 255) / 2;
            g = (g + 166) / 2;
            b = (b + 158) / 2;
            
            calico.setPixelColor(rgbaToInt(r, g, b, p.a), x, y);
        }
    });

    // Copy Calico Row 1 (Down) to Sphynx Row 1
    // Copy Calico Row 4 (Up) to Sphynx Row 4
    for (let x=0; x<sphynx.width; x++) {
        for (let y=0; y<ch2; y++) {
            // Row 1
            sphynx.setPixelColor(calico.getPixelColor(x, y), x, y);
            // Row 4
            let r4_y = ch2 * 3 + y;
            sphynx.setPixelColor(calico.getPixelColor(x, r4_y), x, r4_y);
        }
    }

    newSprites.sphynx = await sphynx.getBase64('image/png');

    // Update sprites.js
    let newContent = content;
    for (let k in newSprites) {
        let varName = 'rawSprite' + k.charAt(0).toUpperCase() + k.slice(1);
        let regex = new RegExp('const ' + varName + ' = \\\'[^\\\']*\\\'', 'g');
        newContent = newContent.replace(regex, "const " + varName + " = '" + newSprites[k] + "'");
    }
    fs.writeFileSync('assets/sprites.js', newContent);
    console.log('Fixed Siamese grid and Sphynx moonwalk/animations!');
}
run();

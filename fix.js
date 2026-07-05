const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const fs = require('fs');

async function run() {
    let newSprites = {};
    const content = fs.readFileSync('assets/sprites.js', 'utf8');

    // Fix Siamese transparency
    let img = await Jimp.read('original_siamese.png');
    img.scan((x, y, idx) => {
        let p = intToRGBA(img.getPixelColor(x,y));
        if (p.g > p.r + 20 && p.g > p.b + 20) {
            img.setPixelColor(0, x, y);
        } else if (p.g > 100 && p.r < 180 && p.b < 180) { 
            img.setPixelColor(0, x, y);
        }
    });
    
    async function fixMoonwalk(imgName) {
        let im = await Jimp.read(imgName === 'siamese' ? 'original_siamese.png' : 'original_' + imgName + '.png');
        if (imgName === 'siamese') im = img; 
        if (imgName === 'british') {
            im = await Jimp.read('processed_british.png');
        }
        if (imgName === 'sphynx') {
            im.scan((x, y, idx) => {
                let p = intToRGBA(im.getPixelColor(x,y));
                if (p.g > 130 && p.r < 160 && p.b < 160) im.setPixelColor(0, x, y);
            });
        }
        
        let ch = im.height / 4;
        for (let x=0; x<im.width; x++) {
            for (let y=0; y<ch; y++) {
                let r1_y = ch * 1 + y; // Row 2 (index 1)
                let r2_y = ch * 2 + y; // Row 3 (index 2)
                let p1 = im.getPixelColor(x, r1_y);
                let p2 = im.getPixelColor(x, r2_y);
                im.setPixelColor(p2, x, r1_y);
                im.setPixelColor(p1, x, r2_y);
            }
        }
        return await im.getBase64('image/png');
    }

    newSprites.siamese = await fixMoonwalk('siamese');
    newSprites.british = await fixMoonwalk('british');
    newSprites.sphynx = await fixMoonwalk('sphynx');

    let newContent = content;
    for (let k in newSprites) {
        let varName = 'rawSprite' + k.charAt(0).toUpperCase() + k.slice(1);
        let regex = new RegExp('const ' + varName + ' = \\\'[^\\\']*\\\'', 'g');
        newContent = newContent.replace(regex, "const " + varName + " = '" + newSprites[k] + "'");
    }
    fs.writeFileSync('assets/sprites.js', newContent);
    console.log('Fixed Siamese, British, Sphynx moonwalk and Siamese transparency');
}
run();

const { Jimp, rgbaToInt, intToRGBA } = require('jimp');
const fs = require('fs');

const brainDir = 'C:\\Users\\diept\\.gemini\\antigravity\\brain\\2acd4225-288e-4465-8fd8-62f45529f344\\';
const inputFiles = {
    siamese: brainDir + 'siamese_cat_sprite_sheet_1783348916999.png',
    sphynx: brainDir + 'sphynx_cat_sprite_sheet_1783348999389.png',
    persian: brainDir + 'persian_cat_sprite_sheet_1783349008351.png',
    tabby: brainDir + 'tabby_cat_sprite_sheet_1783349020134.png',
    black: brainDir + 'black_cat_sprite_sheet_1783349030763.png',
    calico: brainDir + 'calico_cat_sprite_sheet_1783349042656.png'
};

async function processSprites() {
    let newSprites = {};

    function colorDist(c1, c2) {
        return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
    }

    async function makeTransparent(img) {
        let bg = intToRGBA(img.getPixelColor(0,0)); // Use top-left corner as background color
        img.scan((x, y, idx) => {
            let p = intToRGBA(img.getPixelColor(x,y));
            // Transparent if very close to background color (mostly white)
            if (colorDist(p, bg) < 30 || (p.r > 240 && p.g > 240 && p.b > 240)) {
                img.setPixelColor(0, x, y);
            }
        });
        return img;
    }

    for (let key of Object.keys(inputFiles)) {
        let path = inputFiles[key];
        try {
            console.log('Processing ' + key + '...');
            let img = await Jimp.read(path);
            
            // AI generated images might be 1024x1024. If they are large, we might want to scale them.
            // But let's just make it transparent first.
            img = await makeTransparent(img);
            
            let outPath = 'assets/raw_' + key + '.png';
            await img.write(outPath);
            newSprites[key] = await img.getBase64('image/png');
            console.log(key + ' processed and saved to ' + outPath);
        } catch(e) {
            console.error('Error processing ' + key + ':', e);
        }
    }

    // Write to sprites.js
    console.log('Writing to sprites.js...');
    let content = '/* Auto-generated sprites.js */\n\n';
    for (let k of Object.keys(inputFiles)) {
        let varName = 'rawSprite' + k.charAt(0).toUpperCase() + k.slice(1);
        content += "const " + varName + " = '" + newSprites[k] + "';\n\n";
    }
    fs.writeFileSync('assets/sprites.js', content);
    console.log('sprites.js updated successfully!');
}

processSprites().catch(console.error);

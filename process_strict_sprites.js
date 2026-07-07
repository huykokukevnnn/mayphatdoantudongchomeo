const { Jimp, rgbaToInt, intToRGBA } = require('jimp');
const fs = require('fs');

const brainDir = 'C:\\Users\\diept\\.gemini\\antigravity\\brain\\2acd4225-288e-4465-8fd8-62f45529f344\\';
const inputFiles = {
    siamese: brainDir + 'strict_siamese_1783349594001.png',
    sphynx: brainDir + 'strict_sphynx_1783349602149.png',
    persian: brainDir + 'strict_persian_1783349613206.png',
    tabby: brainDir + 'strict_tabby_1783349624917.png',
    black: brainDir + 'strict_black_1783349635219.png',
    calico: brainDir + 'strict_calico_1783349646300.png'
};

async function processSprites() {
    let newSprites = {};

    function colorDist(c1, c2) {
        return Math.abs(c1.r - c2.r) + Math.abs(c1.g - c2.g) + Math.abs(c1.b - c2.b);
    }

    async function makeTransparentFloodFill(img) {
        let w = img.width;
        let h = img.height;
        let visited = new Uint8Array(w * h);
        let bg = intToRGBA(img.getPixelColor(0,0)); 

        let stack = [];
        
        // Push all 4 corners just in case
        const corners = [[0,0], [w-1,0], [0,h-1], [w-1,h-1]];
        for (let c of corners) {
            stack.push(c);
            visited[c[1] * w + c[0]] = 1;
        }

        function isBg(x, y) {
            let p = intToRGBA(img.getPixelColor(x,y));
            // Background is pure white or very close
            return (p.r > 240 && p.g > 240 && p.b > 240) || colorDist(p, bg) < 30;
        }

        while(stack.length > 0) {
            let [cx, cy] = stack.pop();
            
            // Set current pixel to transparent
            img.setPixelColor(0, cx, cy);
            
            // Check neighbors
            let neighbors = [
                [cx + 1, cy],
                [cx - 1, cy],
                [cx, cy + 1],
                [cx, cy - 1]
            ];
            
            for (let i = 0; i < neighbors.length; i++) {
                let nx = neighbors[i][0];
                let ny = neighbors[i][1];
                
                if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                    let idx = ny * w + nx;
                    if (visited[idx] === 0) {
                        visited[idx] = 1;
                        if (isBg(nx, ny)) {
                            stack.push([nx, ny]);
                        }
                    }
                }
            }
        }
        return img;
    }

    for (let key of Object.keys(inputFiles)) {
        let path = inputFiles[key];
        try {
            console.log('Processing ' + key + '...');
            let img = await Jimp.read(path);
            img = await makeTransparentFloodFill(img);
            
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
    let content = '/* Auto-generated sprites.js (Strict Prompts with FloodFill Transparent) */\n\n';
    for (let k of Object.keys(inputFiles)) {
        let varName = 'rawSprite' + k.charAt(0).toUpperCase() + k.slice(1);
        content += "const " + varName + " = '" + newSprites[k] + "';\n\n";
    }
    fs.writeFileSync('assets/sprites.js', content);
    console.log('sprites.js updated successfully!');
}

processSprites().catch(console.error);

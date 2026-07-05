const { Jimp, intToRGBA, rgbaToInt } = require('jimp');
const fs = require('fs');

async function run() {
    let imgFull = await Jimp.read('assets/pokemon_indoor_wide.png');
    let imgEmpty = imgFull.clone();

    // 1. Create Empty State (imgEmpty)
    imgEmpty.scan((x, y, idx) => {
        let p = intToRGBA(imgEmpty.getPixelColor(x,y));
        
        // Food bowl region
        if (x >= 750 && x <= 810 && y >= 325 && y <= 370) {
            // If pixel is brown/kibble color
            if (p.r > p.g && p.g > p.b && p.r > 100 && p.r < 220 && p.b < 100) {
                imgEmpty.setPixelColor(rgbaToInt(120, 130, 140, 255), x, y);
            }
        }
        
        // Water bowl region
        if (x >= 840 && x <= 895 && y >= 325 && y <= 370) {
            // If pixel is blue/water color
            if (p.b > p.r && p.b > p.g && p.b > 120) {
                imgEmpty.setPixelColor(rgbaToInt(120, 130, 140, 255), x, y);
            }
        }
    });

    // 2. Create Lit State (imgLit)
    let imgLit = imgEmpty.clone();
    imgLit.scan((x, y, idx) => {
        let p = intToRGBA(imgLit.getPixelColor(x,y));
        
        // Screen region: roughly X=680 to 760, Y=190 to 240
        if (x >= 680 && x <= 780 && y >= 180 && y <= 250) {
            // If it's a blue screen pixel, make it brighter or neon
            if (p.b > 100 && p.b > p.r) {
                // If it's the light blue paw print (very bright blue)
                if (p.b > 180 && p.g > 150) {
                    // Turn it neon yellow/green
                    imgLit.setPixelColor(rgbaToInt(200, 255, 50, 255), x, y);
                } else {
                    // Turn the dark blue background slightly lighter blue
                    imgLit.setPixelColor(rgbaToInt(Math.min(255, p.r + 50), Math.min(255, p.g + 50), Math.min(255, p.b + 80), 255), x, y);
                }
            }
        }
    });

    await imgEmpty.write('assets/pokemon_indoor_wide_empty.png');
    await imgLit.write('assets/pokemon_indoor_wide_lit.png');
    console.log('States generated!');
}
run();

// Developed by @Varrience
// Modified by @DragonFireGames

const express = require('express');
const Jimp = require('jimp');
const app = express();
const hexDigits = "0123456789abcdef";
function uparse(char) {
  const code = char.codePointAt(0);
  let escape = "";
  for(let i = 12; i >= 0; i-=4) {
    escape += hexDigits[(code >> i) & 15]
  }
  return escape;
}

async function textToCode(text) {
  return new Promise((resolve, reject) => {
    let colours = Array();
    let pixel = '0x';
    for (let i = 0; i < text.length; i++) {
      let parsed = text.charCodeAt(i);
      if (parsed >= 255) {
        text = text.substring(0, i) + "\\u" + uparse(text[i]) + text.substring(i + 1, text.length);
        parsed = 92;
      }
      //console.log(parsed.toString(16).padStart(2,"0"));
      pixel += parsed.toString(16).padStart(2, "0");
      if (pixel.length === 8) {
        colours.push(Number(pixel + "FF"));
        pixel = '0x';
      }
    }
    if (pixel.length > 2) {
      pixel = pixel + 'F'.repeat(10 - pixel.length);
      colours.push(Number(pixel));
    }
    resolve(colours);
  })
}

async function epic_jimp(pixel_colours) {
  return new Promise((resolve, reject) => {
    let width = pixel_colours.length > 720 ? 720 : pixel_colours.length;
    //console.log(pixel_colours.length/width)
    new Jimp(width, Math.ceil(pixel_colours.length / width), function(err, image) {
      if (err) throw err;
      let col = 0;
      for (var i = 0; i < pixel_colours.length; i++) {
        if (i >= (col + 1) * width) { col += 1; }
        image.setPixelColor(pixel_colours[i], i - (col * width), col);
      }
      resolve(image)
    });
  });
}


async function renderImage(file, res) {
  var code = await textToCode(file);
  var img = await epic_jimp(code);
  img = await Jimp.read(img);
  img.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
    res.set("Content-Type", "image/png");
    res.send(buffer);
  });
}

module.exports = {
  renderImage
};
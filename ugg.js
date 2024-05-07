// Developed by @Varrience
// Modified by @DragonFireGames

const Jimp = require('jimp');
const express = require("express");
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
    if (!res.headersSent) {
      res.set("Content-Type", "image/png");
      res.send(buffer);
      return;
    }
    res.end(buffer);
  });
}

var audioDecoder;
import('audio-decode').then(f=>audioDecoder=f);
const audiobufferToMP3Blob = require('audiobuffer-to-blob');
const jsmediatags = require("jsmediatags");
function getMediaTags(buf) {
  return new Promise((res,rej)=>{
    jsmediatags.read(buf, {
      onSuccess: res,
      onError: e=>{
        console.log(e);
        res({tags:{}});
      }
    });
  });
}

var AudioCache = {};
async function returnAudio(blob, name) {
  if (!blob.type.includes("audio/")) throw "Not an audio file";
  var ret = {};
  ret.name = name || "untitled";
  //var type = blob.type.match(/audio\/([^]*)/)[1];
  var buffer = await blob.arrayBuffer();
  var audio = await audioDecoder.default(buffer);
  ret.duration = audio.duration;
  buffer = Buffer.from(buffer);
  var media = await getMediaTags(buffer); // Get tag data;
  console.log(media);
  if (media.tags.artist) ret.artist = media.tags.artist;
  if (media.tags.album) ret.album = media.tags.album;
  if (media.tags.track) ret.track = media.tags.track;
  var cacheid = Math.floor(Math.random()*1e12);
  ret.url = req.protocol+"://"+req.get('host')+"/audiocache/"+cacheid+"/"+ret.name+".mp3";
  returnJSON({ Audio: ret });
  if (blob.type !== "audio/mp3") { // Convert to mp3
    var mp3blob = audiobufferToMP3Blob(audio);
    buffer = await mp3blob.arrayBuffer();
    buffer = Buffer.from(buffer);
  }
  AudioCache[cacheid] = buffer;
  await wait(5*60*1000);
  console.log("Removed "+req.params.id);
  delete AudioCache[req.params.id];
}
app.get("/audiocache/:id/*", async (req, res) => {
  console.log(req.params,req.query);
  console.log(AudioCache);
  res.set("Content-Type", "audio/mp3");
  res.send(AudioCache[req.params.id]);
});

function returnJSON(data) {
  data = JSON.stringify(data);
  if (req.query.test) {
    res.set("Content-Type", "application/json");
    res.send(data);
    return;
  }
  renderImage(data, res);
}


//var cachedResponses = {};
async function getPath(path, callback, long) {
  app.get(path, async (req, res) => {
    console.log(req.params,req.query);
    if (long && !req.query.test) {
      res.set('Content-Type', 'image/png');
      res.write('');
    }
    try {
      var ret = await callback(req,{
        audio: returnAudio(blob,name),
        json: returnJSON(data),
      });
    } catch(e) {
      console.log(e);
      if (typeof e !== "object" && typeof e !== "string") e = e.toString();
      return returnJSON({ Error: e });
    }
  });
}

/*
if (blob.type.includes("audio/")) {
  var ret = {};
  ret.name = path.basename(url) || "None";
  //var type = blob.type.match(/audio\/([^]*)/)[1];
  var buffer = await blob.arrayBuffer();
  var audio = await audioDecoder.default(buffer);
  ret.duration = audio.duration;
  buffer = Buffer.from(buffer);
  var media = await getMediaTags(buffer); // Get tag data;
  console.log(media);
  if (media.tags.artist) ret.artist = media.tags.artist;
  if (media.tags.album) ret.album = media.tags.album;
  if (media.tags.track) ret.track = media.tags.track;
  var cacheid = Math.floor(Math.random()*1e12);
  ret.url = req.protocol+"://"+req.get('host')+"/audiocache/"+cacheid+"/"+ret.name+".mp3";
  ret = {Audio:ret};
  if (blob.type !== "audio/mp3") { // Convert to mp3
    var mp3blob = audiobufferToMP3Blob(audio);
    buffer = await mp3blob.arrayBuffer();
    buffer = Buffer.from(buffer);
  }
  AudioCache[cacheid] = buffer;
  await wait(5*60*1000);
  console.log("Removed "+req.params.id);
  delete AudioCache[req.params.id];
} else {
  if (blob.type.includes("image/") || req.query.test) {
    var buffer = await blob.arrayBuffer();
    buffer = Buffer.from(buffer);
    res.set("Content-Type", blob.type);
    res.send(buffer);
    return;
  }
  ret = await blob.text();
  if (blob.type === "application/json") {
    ret = JSON.parse(ret);
  }
}
throw false;*/

module.exports = {
  renderImage
};
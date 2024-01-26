
// Most of this was developed by @Varrience
// Heavily modified by DragonFireGames

const fs = require('fs');
const express = require('express');
const _jimp = require('./image');
const app = express();
const Jimp = require('jimp');
//var cors = require('cors')
const fetch = require('cross-fetch');
//const got = require('got');
const path = require("path");
const http = require("http");
const https = require("https");
const ytdl = require('ytdl-core');
const master = `https://studio.code.org/v3/sources/`;

app.listen(3000);

app.get('/', (req, res) => {
  res.status(200).send(`
  What are you doing here?<br>
  To convert a JSON file from CDO use /convert/{ID}<br>
  To get info on a CDO project use /info/{ID}<br>
  To send a request to another site use /site?url={full url path here}<br>
  To get audio file duration & name use /audio?url={full url path here}<br>
  To get gif spritesheet /gif?url={full url path here}<br>
  To get youtube video information /youtube/info/{ID}<br>
  `);
});

app.get('/convert/:id', async (req, res) => {
  //let request = await fetch(`${(req.params.id.indexOf("//") > 0 ? req.params.id: master + req.params.id+'/main.json')}`);
  var request = await fetch(`${master + req.params.id}/main.json`);
  if (request.status >= 206) {
    return res.send('Could not find project');
  }
  var file = await request.json();
  renderImage(JSON.stringify(file), res);
})

app.get('/info/:id', async (req, res) => {
  var request = await fetch(`https://studio.code.org/v3/channels/${req.params.id}`);
  if (request.status >= 206) {
    renderImage(`{ 
      "title": "Unknown",
      "updatedAt": "0000-00-00"
    }`);
    var img = await _jimp.epic_jimp(code);
    img.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
      res.set("Content-Type", "image/png");
      res.send(buffer)
    })
    return;
    //return res.send('Could not find project')
  }
  var file = await request.text();
  renderImage(file, res);
})

app.get('/site', async (req, res) => {
  var url = req.query.url;
  var request = await fetch(url);
  var info = await (request.text() || request.json());
  var file = JSON.stringify(info);
  renderImage(file, res);
});

var gm = require("gm");
var request = require("request");
app.get('/gif', async (req, res) => {
  let url = req.query.url;
  if (!url) return;
  console.log("Starting: "+url);
  gm(request(url))
    .coalesce()
    .append()
    .toBuffer((err, buffer) => {
      if (err) {
        throw err;
      } else {
        console.log("Done with: "+url);
        res.set('Content-Type', 'image/png');
        res.send(buffer);
        //fs.writeFile("/cache/"+encodeURIComponent(url)+".png",buffer)
      }
    });
});

var jsmediatags = require("jsmediatags");
const { getAudioDurationInSeconds } = require('get-audio-duration');
app.get('/audio',async (req, res) => {
  let url = req.query.url;
  if (!url) return;
  var data = {};
  data.name = path.basename(url) || "None"; 
  try {
    data.duration = await getAudioDurationInSeconds(url);
  } catch(e) {
    data.duration = 0;
  }
  var onget = async function(stream) {
    var buf = await stream2buffer(stream);
    jsmediatags.read(buf,{
      onSuccess: function(media) {
        if (media.tags.artist) data.artist = media.tags.artist;
        if (media.tags.album) data.album = media.tags.album;
        if (media.tags.track) data.track = media.tags.track; 
        renderImage(JSON.stringify(data), res);
      },
      onError: function(error) {
        renderImage(JSON.stringify(data), res);
      }
    });
  };
  if (url.includes("https://")) https.get(url, onget);
  else http.get(url, onget);
});
function stream2buffer(stream) {
  return new Promise((resolve, reject) => {
    const _buf = [];
    stream.on("data", (chunk) => _buf.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(_buf)));
    stream.on("error", (err) => reject(err));
  });
} 

app.get('/youtube/info/:id', async (req, res) => {
  let id = req.params.id;
  if (!id) return;
  console.log("Loading yt video "+id);
  var info = await ytdl.getInfo('https://www.youtube.com/watch?v='+id);
  var data = {};
  data.name = info.videoDetails.title;
  data.description = info.videoDetails.description;
  data.views = info.videoDetails.viewCount;
  data.category = info.videoDetails.category;
  data.published = info.videoDetails.publishDate;
  data.uploaded = info.videoDetails.uploadDate;
  data.unlisted = info.videoDetails.isUnlisted;
  data.author = {};
  data.author.name = info.videoDetails.author.name;
  data.author.subscribers = info.videoDetails.author.subscriber_count;
  renderImage(JSON.stringify(data), res);
});

//MD5 Hash - Ron Rivest
!function(){function j(r) {var o, e, n, f = [ -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426, -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162, 1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632, 643717713, -373897302, -701558691, 38016083, -660478335, -405537848, 568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784, 1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556, -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222, -722521979, 76029189, -640364487, -421815835, 530742520, -995338651, -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606, -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649, -145523070, -1120210379, 718787259, -343485551 ], t = [ o = 1732584193, e = 4023233417, ~o, ~e ], c = [], a = unescape(encodeURI(r)) + "\u0080", d = a.length;for (r = --d / 4 + 2 | 15, c[--r] = 8 * d; ~d; ) c[d >> 2] |= a.charCodeAt(d) << 8 * d--;for (i = a = 0; i < r; i += 16){for (d = t; 64 > a; d = [ n = d[3], o + ((n = d[0] + [ o & e | ~o & n, n & o | ~n & e, o ^ e ^ n, e ^ (o | ~n) ][d = a >> 4] + f[a] + ~~c[i | 15 & [ a, 5 * a + 1, 3 * a + 5, 7 * a ][d]]) << (d = [ 7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21 ][4 * d + a++ % 4]) | n >>> -d), o, e ]) o = 0 | d[1], e = d[2];for (a = 4; a; ) t[--a] += d[a]}for (r = ""; 32 > a; ) r += (t[a >> 3] >> 4 * (1 ^ a++) & 15).toString(16);return r}(global.md5=j)}();

// FPROF
var accountData;
fs.readFile('./accounts.json', function read(err, data) {
  if (err) throw err;
  accountData = JSON.parse(data);
});
var sessionCache;
fs.readFile('./sessions.json', function read(err, data) {
  if (err) throw err;
  sessionCache = JSON.parse(data);
});

var authtokens = {};
function giveToken(name,res) {
  var tok = randomId(32);
  authtokens[tok] = name;
  var data = {
    tok:tok,
    name:name,
    data:accountData[name]
  };
  renderImage(JSON.stringify(data), res);
}
app.get('/prof/signup', async (req, res) => {
  var name = req.query.name.replace(/[^\w\d_-]/g,"").toLowerCase();
  var cred = md5(req.query.cred);
  var uid = md5(req.query.uid);
  if (accountData[name]) {
    renderImage("Signup Failed: Account already exists", res);
    return;
  }
  accountData[name] = {
    name: req.query.name,
    credentials: cred,
  };
  var data = JSON.parse(req.query.data);
  for (var i in data) {
    accountData[name][i] = data[i];
  }
  fs.writeFile('./accounts.json', JSON.stringify(accountData,1,2),'utf8',function(){});
  sessionCache[uid] = name;
  fs.writeFile('./sessions.json', JSON.stringify(sessionCache,1,2),'utf8',function(){});
  giveToken(name,res);
});
app.get('/prof/signin', async (req, res) => {
  var name = req.query.name.toLowerCase();
  var cred = md5(req.query.cred);
  var uid = md5(req.query.uid);
  if (!accountData[name]) {
    renderImage("Login Failed: Account nonexistant", res);
    return;
  }
  if (accountData[name].credentials !== cred) {
    renderImage("Login Failed: Invalid credentials", res);
    return;
  }
  sessionCache[uid] = name;
  fs.writeFile('./sessions.json', JSON.stringify(sessionCache,1,2),'utf8',function(){});
  giveToken(name,res);
});
app.get('/prof/checkin', async (req, res) => {
  var uid = md5(req.query.uid);
  var name = sessionCache[uid];
  if (!name) {
    renderImage("Failed: User ID not registered", res);
    return;
  }
  giveToken(name,res);
});
app.get('/prof/signout', async (req, res) => {
  var uid = md5(req.query.uid);
  var tok = req.query.tok;
  // Check
  var name = sessionCache[uid];
  var name2 = authtokens[tok];
  if (!name || !name2 || name != name2) {
    renderImage("Error: Not authenticated", res);
    return;
  }
  // Delete
  delete sessionCache[uid];
  fs.writeFile('./sessions.json', JSON.stringify(sessionCache,1,2),'utf8',function(){});
  delete authtokens[tok];
  renderImage("Successfully signed out", res);
});
app.get('/prof/update', async (req, res) => {
  var tok = req.query.tok;
  // Check
  var name = authtokens[tok];
  if (!name) {
    renderImage("Error: Not authenticated", res);
    return;
  }
  // Update
  var data = JSON.parse(req.query.data);
  for (var i in data) {
    accountData[name][i] = data[i];
    if (data[i] === null) delete accountData[name][i];
  }
  fs.writeFile('./accounts.json', JSON.stringify(accountData,1,2),'utf8',function(){});
});
app.get('/prof/delete', async (req, res) => {
  var cred = md5(req.query.cred);
  var uid = md5(req.query.uid);
  var tok = req.query.tok;
  // Check
  var name = sessionCache[uid];
  var name2 = authtokens[tok];
  if (!name || !name2 || name != name2 || cred != accountData[name].credentials) {
    renderImage("Error: Not authenticated", res);
    return;
  }
  // Delete
  delete accountData[name];
  fs.writeFile('./accounts.json', JSON.stringify(accountData,1,2),'utf8',function(){});
  for (var i in sessionCache) {
    if (sessionCache[i] == name) delete sessionCache[i];
  }
  fs.writeFile('./sessions.json', JSON.stringify(sessionCache,1,2),'utf8',function(){});
  for (var i in authtokens) {
    if (authtokens[i] == name) delete authtokens[i];
  }
  renderImage("Successfully deleted your account", res);
});
app.get('/prof/get/:name', async (req, res) => {
  var name = req.params.name;
  // Check
  var data = accountData[name];
  if (!data) {
    renderImage("Error: Nonexistent user", res);
    return;
  }
  renderImage(JSON.stringify(data), res);
});
app.get('/prof/getall', async (req, res) => {
  renderImage(JSON.stringify(accountData), res);
});

//

async function renderImage(file, res) {
  var code = await _jimp.textToCode(file);
  var img = await _jimp.epic_jimp(code);
  img = await Jimp.read(img);
  img.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
    res.set('Content-Type', 'image/png');
    res.send(buffer);
  });
}
function randomId(len,alphabet) {
  alphabet = alphabet || "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/+"
  var str = "";
  for (var i = 0; i < len; i++) {
    str += alphabet[Math.floor(Math.random()*alphabet.length)];
  }
  return str;
}

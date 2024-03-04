// Most of this was developed by @Varrience
// Heavily modified by DragonFireGames

const fs = require("fs");
const express = require("express");
const { renderImage } = require("./image");
const app = express();
const Jimp = require("jimp");
//var cors = require('cors')
const fetch = require("cross-fetch");
//const got = require('got');
const path = require("path");
const http = require("http");
const https = require("https");
const ytdl = require("ytdl-core");
const master = `https://studio.code.org/v3/sources/`;

app.set("trust proxy", true);

app.listen(3000);

app.get("/", (req, res) => {
  res.status(200).send(`<script>
    location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  </script>`); // rickroll bc funny
});

app.get("/docs", (req, res) => {
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

app.get("/ping", async (req, res) => {
  renderImage("Awake!", res);
});

/*app.get("/convert/:id", async (req, res) => {
  //let request = await fetch(`${(req.params.id.indexOf("//") > 0 ? req.params.id: master + req.params.id+'/main.json')}`);
  var request = await fetch(`${master + req.params.id}/main.json`);
  if (request.status >= 206) {
    return renderImage("Could not find project",res);
  }
  var file = await request.json();
  renderImage(JSON.stringify(file), res);
});

app.get("/info/:id", async (req, res) => {
  var request = await fetch(
    `https://studio.code.org/v3/channels/${req.params.id}`,
  );
  if (request.status >= 206) {
    return renderImage(`{ 
      "title": "Unknown",
      "updatedAt": "0000-00-00"
    }`,res);
    //return res.send('Could not find project')
  }
  var file = await request.text();
  renderImage(file, res);
});*/

app.get("/fetch", async (req, res) => {
  var url = req.query.url;
  if (url !== undefined) {
    var ret;
    try {
      var data = JSON.parse(req.query.data||"{}");
      var request = await fetch(url,data);
      if (request.status >= 206) throw "Could not fetch; Error Code: "+request.status;
      var blob = await request.blob();
      if (blob.type.includes("image/") || req.query.proxy) {
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
    } catch(e) {
      ret = { Error: e };
    }
  } else {
    ret = { Error: "No URL provided" };
  }
    console.log(ret);
  if (ret === undefined) ret = { Error: "undefined" };
  if (typeof ret === "object") ret = JSON.stringify(ret);
  if (req.query.proxy) {
    res.set("Content-Type", "text/plain");
    res.send(ret);
    return;
  }
  renderImage(ret, res);
});

app.get("/proxy", async (req, res) => {
  var url = req.query.url;
  try {
    var data = JSON.parse(req.query.data||"{}");
    var request = await fetch(url,data);
    if (request.status >= 206) throw "Error "+request.status;
    var blob = await request.blob();
    if (blob.type == "text/html") {
      var text = await blob.text();
      console.log(text);
      var matches = url.match(/^(?:https?:\/\/)?(?:[^@\/\n]+@)?([^:\/?\n]+)/)[1];
      var domain = matches[0]+matches[1];
      text = text.replace(/((?:src|href)\s*=\s*")/g,`$1https://cdo-backend.onrender.com/proxy?url=`+domain);
      text = text.replaceAll(domain+"http","http");
      text = text.replace("<head>",`<head><script>
if (!window._fetch) window.__fetch = window.fetch;
window.fetch = async function(){
  console.log.apply(null,arguments);
  return await window.__fetch.apply(this,arguments);
}; 
</script>`);
      console.log(text);
      res.set("Content-Type", "text/html");
      res.send(text);
      return;
    }
    var buffer = await blob.arrayBuffer();
    buffer = Buffer.from(buffer);
    res.set("Content-Type", blob.type);
    res.send(buffer);
  } catch(e) {
    res.set("Content-Type", "application/json");
    res.send(JSON.stringify(e));
  }
});

var gm = require("gm");
var request = require("request");
app.get("/gif", async (req, res) => {
  let url = req.query.url;
  if (!url) return;
  console.log("Starting: " + url);
  gm(request(url))
    .coalesce()
    .append()
    .toBuffer((err, buffer) => {
      if (err) {
        throw err;
      } else {
        console.log("Done with: " + url);
        res.set("Content-Type", "image/png");
        res.send(buffer);
        //fs.writeFile("/cache/"+encodeURIComponent(url)+".png",buffer)
      }
    });
});

var jsmediatags = require("jsmediatags");
const { getAudioDurationInSeconds } = require("get-audio-duration");
app.get("/audio", async (req, res) => {
  let url = req.query.url;
  if (!url) return;
  var data = {};
  data.name = path.basename(url) || "None";
  try {
    data.duration = await getAudioDurationInSeconds(url);
  } catch (e) {
    data.duration = 0;
  }
  var onget = async function (stream) {
    var buf = await stream2buffer(stream);
    jsmediatags.read(buf, {
      onSuccess: function (media) {
        if (media.tags.artist) data.artist = media.tags.artist;
        if (media.tags.album) data.album = media.tags.album;
        if (media.tags.track) data.track = media.tags.track;
        renderImage(JSON.stringify(data), res);
      },
      onError: function (error) {
        renderImage(JSON.stringify(data), res);
      },
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

app.get("/youtube/info/:id", async (req, res) => {
  let id = req.params.id;
  if (!id) return;
  console.log("Loading yt video " + id);
  var info = await ytdl.getInfo("https://www.youtube.com/watch?v=" + id);
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
!(function () {
  function j(r) {
    var o,
      e,
      n,
      f = [
        -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426,
        -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162,
        1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632,
        643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
        568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784,
        1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556,
        -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222,
        -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
        -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606,
        -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649,
        -145523070, -1120210379, 718787259, -343485551,
      ],
      t = [(o = 1732584193), (e = 4023233417), ~o, ~e],
      c = [],
      a = unescape(encodeURI(r)) + "\u0080",
      d = a.length;
    for (r = (--d / 4 + 2) | 15, c[--r] = 8 * d; ~d; )
      c[d >> 2] |= a.charCodeAt(d) << (8 * d--);
    for (i = a = 0; i < r; i += 16) {
      for (
        d = t;
        64 > a;
        d = [
          (n = d[3]),
          o +
            (((n =
              d[0] +
              [(o & e) | (~o & n), (n & o) | (~n & e), o ^ e ^ n, e ^ (o | ~n)][
                (d = a >> 4)
              ] +
              f[a] +
              ~~c[i | (15 & [a, 5 * a + 1, 3 * a + 5, 7 * a][d])]) <<
              (d = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21][
                4 * d + (a++ % 4)
              ])) |
              (n >>> -d)),
          o,
          e,
        ]
      )
        (o = 0 | d[1]), (e = d[2]);
      for (a = 4; a; ) t[--a] += d[a];
    }
    for (r = ""; 32 > a; )
      r += ((t[a >> 3] >> (4 * (1 ^ a++))) & 15).toString(16);
    return r;
  }
  global.md5 = j;
})();

const bcrypt = require("bcrypt");
const saltRounds = 10;

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri =
  "mongodb+srv://dragonfire7z:" +
  process.env.MONGODB_PASSWORD +
  "@cdo-backend.sredm6y.mongodb.net/?retryWrites=true&w=majority";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const mongocl = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await mongocl.connect();
    // Send a ping to confirm a successful connection
    await mongocl.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
    //
    for (var i = 0; i < APIList.length; i++) {
      APIList[i].db = mongocl.db("cdo-api").collection(APIList[i].name);
      APIList[i].ondbload();
    }
  } catch(e) {
    await run()
  }
}
run().catch(console.dir);
process.on("SIGINT", async function () {
  console.log("Ending");
  await client.close();
  process.exit(0);
});

var APIList = [];
function createAPI(name) {
  var obj = {};
  obj.name = name;
  obj.on = function (event, callback) {
    app.get("/" + name + "/" + event, async (req, res) => {
      try {
        var data = JSON.parse(req.query.data || "{}");
        var ret = await callback(data);
      } catch (e) {
        var ret = "Error: "+e;
      }
      if (ret === undefined) ret = "undefined";
      renderImage(JSON.stringify(ret), res);
    });
  };
  obj.save = async function (id, data) {
    var val = {};
    val._id = id;
    val.data = data;
    return await obj.db.replaceOne({ _id: id }, val, { upsert: true });
  };
  obj.get = async function (id, def) {
    var val = await obj.db.findOne({ _id: id });
    if (val === null) return def;
    return val.data;
  };
  obj.delete = async function (id) {
    return await obj.db.deleteOne({ _id: id });
  };
  obj.ondbload = function () {};
  APIList.push(obj);
  return obj;
}
function randomId(len, alphabet) {
  alphabet =
    alphabet ||
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_/+";
  var str = "";
  for (var i = 0; i < len; i++) {
    str += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return str;
}

// FPROF
var accountData = {};
var publicAccData = {};
var sessionCache = {};
var authtokens = {};
var admintokens = {};
function giveToken(name) {
  var tok = randomId(32);
  authtokens[tok] = name;
  return {
    tok: tok,
    name: name,
    data: publicAccData[name],
  };
}
var profapi = createAPI("prof");
profapi.ondbload = async () => {
  accountData = await profapi.get(0, {});
  updatePublicAccData();
};
function updatePublicAccData() {
  publicAccData = JSON.parse(JSON.stringify(accountData));
  for (var i in publicAccData) {
    delete publicAccData[i].credentials;
  }
}
async function saveAccData() {
  updatePublicAccData();
  return await profapi.save(0, accountData);
}
profapi.on("signup", async (data) => {
  var name = data.name.replace(/[^\w\d_-]/g, "").toLowerCase();
  if (name.length < 3) throw "Signup Failed: Name too short (less than 3 chars)";
  //var cred = md5(data.cred);
  var cred = await bcrypt.hash(data.cred, saltRounds);
  var uid = md5(data.uid);
  if (accountData[name] !== undefined)
    throw "Signup Failed: Account already exists";
  accountData[name] = {
    name: name,
    displayname: data.name,
    credentials: cred,
    avatar: "default",
    bio: "",
    friends: {},
    requests: {},
    coins: 0,
    joinedAt: Date.now(),
    public: {},
  };
  var def = data.data;
  for (var i in def) {
    if (i == "public") continue;
    accountData[name][i] = def[i];
  }
  if (def.public)
    for (var i in def.public) {
      accountData[name].public[i] = def.public[i];
    }
  saveAccData();
  sessionCache[uid] = name;
  //fs.writeFile('./sessions.json', JSON.stringify(sessionCache,1,2),'utf8',function(){});
  return giveToken(name);
});
profapi.on("signin", async (data) => {
  var name = data.name.toLowerCase();
  var uid = md5(data.uid);
  if (!accountData[name]) throw "Login Failed: Account doesn't exist";
  //var credvalid = accountData[name].credentials === md5(data.cred);
  var credvalid = await bcrypt.compare(
    data.cred,
    accountData[name].credentials,
  );
  if (!credvalid) throw "Login Failed: Invalid credentials";
  var def = data.data;
  for (var i in def) {
    if (i == "public") continue;
    if (accountData[name][i]) continue;
    accountData[name][i] = def[i];
  }
  if (def.public)
    for (var i in def.public) {
      if (accountData[name].public[i]) continue;
      accountData[name].public[i] = def.public[i];
    }
  saveAccData();
  console.log(uid);
  sessionCache[uid] = name;
  //fs.writeFile('./sessions.json', JSON.stringify(sessionCache,1,2),'utf8',function(){});
  return giveToken(name);
});
profapi.on("checkin", async (uid) => {
  console.log(uid);
  console.log(sessionCache);
  uid = md5(uid);
  var name = sessionCache[uid];
  if (!name) throw "User ID not registered";
  return giveToken(name);
});
profapi.on("signout", async (data) => {
  var uid = md5(data.uid);
  var tok = data.tok;
  // Check
  var name = sessionCache[uid];
  var name2 = authtokens[tok];
  if (!name || !name2 || name != name2) throw "Not authenticated";
  // Delete
  delete sessionCache[uid];
  //fs.writeFile('./sessions.json', JSON.stringify(sessionCache,1,2),'utf8',function(){});
  delete authtokens[tok];
  delete admintokens[tok];
  return "Successfully signed out";
});
profapi.on("update", async (data) => {
  var tok = data.tok;
  // Check
  var name = data.name;
  var name2 = authtokens[tok];
  if (!name || (name != name2 && !admintokens[tok]))
    return "Not authenticated";
  // Update
  var update = data.data;
  var blocked = {
    name: 1,
    credentials: 1,
  };
  for (var i in update) {
    if (blocked[i]) continue;
    accountData[name][i] = update[i];
    if (data[i] === null) delete accountData[name][i];
  }
  if (update.public)
    for (var i in update.public) {
      accountData[name].public[i] = update.public[i];
      if (update.public[i] === null) delete accountData[name].public[i];
    }
  saveAccData();
  return publicAccData[name];
});
profapi.on("update/public", async (data) => {
  var tok = data.tok;
  // Check
  var name = data.name;
  if (!authtokens[tok]) return "Not authenticated";
  // Update
  var update = data.data;
  for (var i in update) {
    accountData[name].public[i] = update[i];
    if (update[i] === null) delete accountData[name].public[i];
  }
  saveAccData();
  return publicAccData[name];
});
profapi.on("friend", async (data) => {
  // Check
  var myname = authtokens[data.tok];
  if (!myname) return "Not authenticated";
  var name = data.name;
  var acc = accountData[name];
  var myacc = accountData[myname];
  if (!acc || !myacc) throw "Nonexistent user";
  if (myacc.requests[name]) delete myacc.requests[name];
  else acc.requests[myname] = true;
  myacc.friends[name] = true;
  saveAccData();
  return "Successfully added friend";
});
profapi.on("unfriend", async (data) => {
  // Check
  var myname = authtokens[data.tok];
  if (!myname) return "Not authenticated";
  var name = data.name;
  var acc = accountData[name];
  var myacc = accountData[myname];
  if (!acc || !myacc) throw "Nonexistent user";
  delete myacc.friends[name];
  delete acc.requests[myname];
  if (acc.friends[myname]) myacc.requests[name] = true;
  saveAccData();
  return "Successfully removed friend";
});
profapi.on("delete", async (data) => {
  var uid = md5(data.uid);
  var tok = data.tok;
  // Check
  var name = sessionCache[uid];
  var name2 = authtokens[tok];
  if (!name || !name2 || name != name2) throw "Not Authenticated";
  //var credvalid = accountData[name].credentials === md5(data.cred);
  var credvalid = await bcrypt.compare(
    data.cred,
    accountData[name].credentials,
  );
  if (!credvalid) throw "Invalid Credentials";
  // Delete
  delete accountData[name];
  for (var i in accountData) {
    delete accountData[i].friends[name];
    delete accountData[i].requests[name];
  }
  saveAccData();
  for (var i in sessionCache) {
    if (sessionCache[i] == name) delete sessionCache[i];
  }
  //fs.writeFile('./sessions.json', JSON.stringify(sessionCache,1,2),'utf8',function(){});
  for (var i in authtokens) {
    if (authtokens[i] == name) delete authtokens[i];
  }
  return "Successfully deleted your account";
});
profapi.on("get", async (name) => {
  // Check
  var acc = publicAccData[name];
  if (!acc) throw "Nonexistent or deleted user";
  return acc;
});
profapi.on("getall", async () => {
  return publicAccData;
});
const adminpswd = process.env.ADMIN_PASSWORD;
profapi.on("admin/elevate", async (data) => {
  var tok = data.tok;
  if (!authtokens[tok]) throw "No valid token";
  if (data.cred !== adminpswd) throw "Invalid credentials";
  admintokens[tok] = true;
  return "Successfully became admin";
});
//

var dbapi = createAPI("db");
dbapi.on("set", async (data) => {
  var id = data.name + ":" + data.key;
  await dbapi.save(id, data.value);
  return "Done!";
});
dbapi.on("get", async (data) => {
  var id = data.name + ":" + data.key;
  return await dbapi.get(id, data.default || undefined);
});
dbapi.on("delete", async (data) => {
  var id = data.name + ":" + data.key;
  await dbapi.delete(id);
  return "Done!";
});

// IP grabber???
var storedData = {};
app.use(require("express-useragent").express());
app.get("/ip", async (req, res) => {
  const ip = req.query.ip || req.ip || req.headers["x-forwarded-for"]?.split(",").shift() || req.socket?.remoteAddress;
  const agent = req.useragent;
  const info = await fetch("https://ipinfo.io/"+ip).then(v=>v.text());
  const h = info.match(/<table[^]+?<\/table>/g).map(function(e){return e.replace(/\\n/g,"").split(/\<|\>/);});
  const coords = h[1][90].split(",");
  const language = req.headers["accept-language"]?.split(",").shift() || "en-US";
  var data = {
    IP: ip,
    isMobile: agent.isMobile,
    browser: agent.browser,
    version: agent.version,
    os: agent.os,
    platform: agent.platform,
    //agent: agent.source,
    ASN: h[0][18],
    hostname: h[0][36],
    //range: h[0][54],
    company: h[0][72],
    hosted_domains: Number(h[0][88]),
    VPN: !(h[0][110].includes("False")),
    anycast: !(h[0][132].includes("False")),
    ASNtype: h[0][148],
    abuse_contact: h[0][166],
    city: h[1][10],
    state: h[1][22],
    country: h[1][40],
    postal: h[1][54],
    timezone: h[1][78],
    longitude: Number(coords[0]),
    latitude: Number(coords[1]),
    language: language
  };
  console.log(data);
  storedData[req.params.id] = data;
  res.status(200).send(JSON.stringify(data));
});
app.get("/ip/grab", async (req, res) => {
  if (!storedData[req.params.id]) {
    console.log("Not found: "+req.params.id);
    renderImage(JSON.stringify({ Error: "No Data" }), res);
    return;
  }
  renderImage(JSON.stringify(storedData[req.params.id]), res);
  delete storedData[req.params.id];
});

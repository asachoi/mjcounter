var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
var calObj = require("./calObj");


var app = express();
var game = {};

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

// Server index page
app.get("/", function (req, res) {
    res.send("Deployed!");
});

// Facebook Webhook
// Used for verification
app.get("/webhook", function (req, res) {
    if (req.query["hub.verify_token"] === 'JIFUDO') {
        console.log("Verified webhook");
        res.status(200).send(req.query["hub.challenge"]);
    } else {
        console.error("Verification failed. The tokens do not match.");
        res.sendStatus(403);
    }
});

// All callbacks for Messenger will be POST-ed here
app.post("/webhook", function (req, res) {
    // Make sure this is a page subscription
    //console.log(JSON.stringify(req))
    if (req.body.object == "page") {
        // Iterate over each entry
        // There may be multiple entries if batched
        req.body.entry.forEach(function(entry) {
            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                if (event.message) {
                    processMessage(event);
                }
            });
        });

        res.sendStatus(200);
    }
});



function processMessage(event) {
    if (!event.message.is_echo) {
        var message = event.message;
        var senderId = event.sender.id;
        var text = message.text


        console.log(message)

        if(message.quick_reply) {
            var payload = message.quick_reply.payload
            var type = payload.split('.')[0]
            var value = payload.split('.')[1]

            switch(type) {
                case 'winner':
                game.winner = value;
                sendReply(senderId, ['Yes', 'No'], "self")
                break
                case 'self':
                game.self = value;
                sendReply(senderId, [3,4,5,6,7,8,9,10], "fan")
                break
                case 'fan':
                game.fan = value;
                if(game.self=='Yes')  {
                    calObj.addGame(game)
                    sum(senderId);
                }
                else {
                    sendReply(senderId,calObj.players , "loser", game.winner)
                }
                break
                case 'loser':
                    game.loser = value;
                    calObj.addGame(game);
                    sum(senderId);
                //sendReply(senderId,calObj.players , "loser", game.winner)
                break
            }
            console.log(game)
        }

        if(!text) {
            sendMessage(senderId, {text: "start, log, sum"});
        }
        else {

            var commands = text.split(' ')



            switch(commands[0].toLowerCase()) {
                case 'start':
                    calObj.games = [];
                    calObj.setPayScales([16,32,48,64,92,128,192,256])
                    commands.shift()
                    calObj.setPlayers(commands)
                    console.log(calObj.players)
                    sum(senderId)
                    break
                case 'log':
                    game = {}
                    sendReply(senderId, calObj.players, "winner")
                    break
                case 'sum':
                    sum(senderId)

                    break
            }
        }

    }
}

var sum = function(senderId) {
                    calObj.calculate()
                    var result = ''
                    calObj.results.forEach(x => result += (x.name + ": " + x.balance + "\n"))
                    sendMessage(senderId, {text: result});
}


// sends message to user
function sendMessage(recipientId, message) {
    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: "POST",
        json: {
            recipient: {id: recipientId},
            message: message,
        }
    }, function(error, response, body) {
        if (error) {
            console.log("Error sending message: " + response.error);
        }
    });
}

function sendReply(recipientId, replies, type, except) {

  var reps = replies
  .filter(function(text) {
        return text!=except
  })
  .map(function(text) {
        return    {
               "content_type":"text",
               "title":text,
               "payload":type + '.' + text
        }
  })

  var msg = {
      "recipient":{
        "id":recipientId
      },
      "message":{
        "text": type,
        "quick_replies":reps
      }
  }

  request({
      url: "https://graph.facebook.com/v2.6/me/messages",
      qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
      method: "POST",
      json: msg
  }, function(error, response, body) {
      if (error) {
          console.log("Error sending message: " + response.error);
      }
  });
}

function sendTemplate(recipientId, message) {
    var template = {
      "recipient":{
        "id": recipientId
      },
      "message":{
        "attachment":{
          "type":"template",
          "payload":{
            "template_type":"button",
            "text": "Testing",
            "buttons":[
              {
                "type":"web_url",
                "url":"https://petersapparel.parseapp.com",
                "title":"Show Website"
              },
              {
                "type":"postback",
                "title":"Start Chatting",
                "payload":"USER_DEFINED_PAYLOAD"
              }
            ]
          }
        }
      }
    }

    console.log(JSON.stringify(template))

    request({
        url: "https://graph.facebook.com/v2.6/me/messages",
        qs: {access_token: process.env.PAGE_ACCESS_TOKEN},
        method: "POST",
        json: template
    }, function(error, response, body) {
        if (error) {
            console.log("Error sending message: " + response.error);
        }
    });
}


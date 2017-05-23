var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

var count = 0;
var gameStart = false
var players = ['a','b','c', 'd'];
var games = []
var game = {};
var payScale = [16,24,32,48,64,96,128,256]



// Server index page
app.get("/", function (req, res) {
    res.send("Deployed!");
});

// Facebook Webhook
// Used for verification
app.get("/webhook", function (req, res) {
    if (req.query["hub.verify_token"] === process.env.VERIFICATION_TOKEN) {
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


        // You may get a text or attachment but not both
        if (message.text) {
            var formattedMsg = message.text.toLowerCase().trim();
            var command = formattedMsg.split(" ")[0];

            if(message.quick_reply && message.quick_reply.payload) {
                var payload = message.quick_reply.payload.split(".");
                var type=payload[0]
                var value=payload[1]

                if(type == 'winner') {
                    game.winner = value;
                    sendReply(senderId, [3,4,5,6,7,8,9,10], 'fan')

                }

                if(type == 'fan') {
                    game.fan = value
                    sendReply(senderId, ['Yes', 'No'], 'self')
                }


                if(type == 'self') {
                    game.self = value
                    if(game.self == 'No') {
                        sendReply(senderId, players, 'loser', game.winner)
                    }
                    else {
                         addGame(senderId);
                    }
                }

                if(type == 'loser') {
                    game.loser = value
                    addGame(senderId);
                }
            }


            // If we receive a text message, check to see if it matches any special
            // keywords and send back the corresponding movie detail.
            // Otherwise search for new movie.
            switch (command) {
                case "start":
                    gameStart = true;
                    break
                case "players":
                    //sendReply(senderId, formattedMsg.split(" "))
                    setPlayers(formattedMsg)
                    sendMessage(senderId, "players: " + players.join(','))

                    break
                case "result":
                    showResult(senderId)
                    break
                case "log":
                    game = {winner:'', self:'', loser: ''}
                    sendReply(senderId, players, 'winner')
                    break;
                default:
                    //findMovie(senderId, formattedMsg);
            }
        } else if (message.attachments) {
            sendMessage(senderId, {text: "Sorry, I don't understand your request."});
        }
    }
}

var addGame = function(senderId) {
    games.push(game)
    sendMessage(senderId, {text: "Game Added"});
    console.log(games);

}

var setPlayers = function(msg) {
    players = [];
    msg.split(" ").forEach(function(player)
        {
            if(player != 'players')
                players.push(player)
        }
    )
    //players = ['aaa', 'bbb', 'ccccc']
}

var showResult = function(id) {

    var results = [];

    players.forEach(function(p)
        {
            results.push(
              {
                name:p,
                balance: 0

              }
            )
        }
    )
/*

    games.forEach(
        function(game) {
            var pay = payScale[game.fan - 3];

            if(game.self == 'Yes') {
                results
                    .filter(function(x) {
                       return  x.name == game.winner
                    })
                    .forEach(function(item) {
                        item.balance += pay * 1.5;

                    }
                )

                results
                    .filter(function(x) {
                       return  x.name != game.winner
                    })
                    .forEach(function(item) {
                        item.balance -= pay * 0.5;
                    }
                )
            }
            else {
                results
                    .filter(function(x) {
                        return x.name == game.winner
                    })
                    .forEach(function(item) {
                        item.balance += pay;
                        console.debug(item.balance)
                    }
                )

                results
                    .filter(function(x) {
                       return  x.name == game.loser
                    })
                    .forEach(function(item) {
                        item.balance -= pay;
                        console.debug(item.balance)
                    }
                )
            }
        }
    );
*/
    return results
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


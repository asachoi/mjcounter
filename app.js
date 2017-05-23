var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");
var calObj = require("./calObj");


var app = express();
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

        console.log(message);
        var command = message.text.split(' ')[0].toLowerCase();

        switch(command) {
            case 'players': {
                message.text.split(' ').shift()
                calObj.setPlayers(command)
                console.log(calObj.players)
                sendMessage(senderId, {'Text': 'Player Set'})
            }

        }

      calObj.setPlayers(['A', 'B', 'C', 'D'])
      calObj.setPayScales([16,32,48,64,92,128,192,256])

      calObj.addGame({
        winner: 'A',
        loser: 'B',
        self: 'No',
        fan: 5
      })

      calObj.addGame({
        winner: 'B',
        //loser: 'C',
        self: 'Yes',
        fan: 6
      })
      calObj.calculate()
      console.log(calObj.results)



    }
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


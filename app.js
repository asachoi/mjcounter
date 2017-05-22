const express = require("express");
const Botly = require("botly");
const botly = new Botly({
    accessToken: process.env.PAGE_ACCESS_TOKEN, //page access token provided by facebook
    verifyToken: process.env.VERIFICATION_TOKEN //needed when using express - the verification token you provided when defining the webhook in facebook
    //webHookPath: "/webhook", //defaults to "/",
    //notificationType: Botly.CONST.REGULAR //already the default (optional),
});

botly.on("message", (senderId, message, data) => {
    console.log(senderId);
    let text = `echo: ${data.text}`;

    botly.sendText({
      id: senderId,
      text: text
    });
});

console.log(JSON.stringify(botly));

const app = express();
app.use("/webhook", botly.router());
app.listen((process.env.PORT || 5000));


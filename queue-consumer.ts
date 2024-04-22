import * as amqp from "amqplib/callback_api";
const socketIoClient = require("socket.io-client");
import { Socket } from "socket.io-client";

const USERNAME = "katalyst"
const PASSWORD = encodeURIComponent("guest12345");
const HOSTNAME = "44.217.29.217";
const PORT = 5672
const RABBITMQ_DATA = "Payment";
const WEBSOCKET_SERVER_URL = "http://184.72.246.90:4000/";

let socketIO: Socket;

async function sendDatatoAPI(data: any) {
  //API PAYMENT
  const apiUrl = 'http://34.197.57.0:4000/orders/confirm';

  const requestData = {
    body: JSON.stringify(data),
  };

  console.log(requestData.body)

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: requestData.body,
  });

  console.log('API DATA RESPONSE: ',response.status);
}

async function connect() {
  try {
    const url = `amqp://${USERNAME}:${PASSWORD}@${HOSTNAME}:${PORT}`;
    amqp.connect(url, (err: any, conn: amqp.Connection) => {
      console.log("Connecting to RabbitMQ", url);
      if (err) throw new Error(err);

      conn.createChannel((errChanel: any, channel: amqp.Channel) => {
        if (errChanel) throw new Error(errChanel);

        channel.assertQueue(RABBITMQ_DATA, {durable:true, arguments:{"x-queue-type":"quorum"}});

        socketIO = socketIoClient(WEBSOCKET_SERVER_URL, {
          transports: ['websocket'], // Forzar el uso de WebSocket
          upgrade: false // Deshabilitar actualizaciones automáticas (no se necesita en Node.js)
        });

        socketIO.on("connect", () => {
          console.log("Connected to WebSocket Server");
        });

        channel.consume(RABBITMQ_DATA, async (data: amqp.Message | null) => {
          if (data?.content !== undefined) {
            const parsedContent = JSON.parse(data.content.toString());
            console.log("order:processed:", parsedContent);
            socketIO.emit("order:processed", parsedContent);
            await sendDatatoAPI(parsedContent);
            channel.ack(data);
          }
        });
      });
    });
  } catch (err: any) {
    throw new Error(err);
  }
}

connect();

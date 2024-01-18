const XWebSocket = require('ws')
const PORT = process.env.PORT || 3000;
const fs = require('fs');
const https = require('http');

// Yes, TLS is required for WebRTC
const serverConfig = {
  //key: fs.readFileSync('key.pem'),
  //cert: fs.readFileSync('cert.pem'),
};


const users = []

const Types = {
    SignIn: "SignIn",
    StartStreaming: "StartStreaming",
    UserFoundSuccessfully: "UserFoundSuccessfully",
    Offer: "Offer",
    Answer: "Answer",
    IceCandidates: "IceCandidates",
    EndCall: "EndCall",
}

function main() {
  const httpsServer = startHttpsServer(serverConfig);
  startWebSocketServer(httpsServer);
  printHelp();
}


function startHttpsServer(serverConfig) {
  // Handle incoming requests from the client
  const handleRequest = (request, response) => {
    console.log(`request received: ${request.url}`);

    // This server only serves two files: The HTML page and the client JS file
    if(request.url === '/') {
      response.writeHead(200, {'Content-Type': 'text/html'});
      response.end(fs.readFileSync('client/index.html'));
    } else if(request.url === '/remote.js') {
      response.writeHead(200, {'Content-Type': 'application/javascript'});
      response.end(fs.readFileSync('client/remote.js'));
    }
  };

  const httpsServer = https.createServer(serverConfig, handleRequest);
  httpsServer.listen(PORT, '0.0.0.0');
  return httpsServer;
}


function startWebSocketServer(httpsServer) {
    // Create a server for handling websocket calls
    const webSocket = new XWebSocket.Server({server: httpsServer});

    webSocket.on('connection', connection => {
      connection.on('message', message => {
        console.log(`Received message => ${message}`)
        try {
            const data = JSON.parse(message);
            const currentUser = findUser(data.username)
            const userToReceive = findUser(data.target)        
        
            switch (data.type) {
                case Types.SignIn:
                    if (currentUser) {
                        return
                    }
        
                    users.push({username: data.username, conn: connection, password: data.data})
                    break
                case Types.StartStreaming :
                    if (userToReceive) {
                            sendToConnection(userToReceive.conn, {
                                type: Types.StartStreaming,
                                username: currentUser.username,
                                target: userToReceive.username
                            })
                    }
                    break
                case Types.Offer :
                    if (userToReceive) {
                        sendToConnection(userToReceive.conn, {
                            type: Types.Offer, username: data.username, data: data.data
                        })
                    }
                    break
                case Types.Answer :
                    if (userToReceive) {
                        sendToConnection(userToReceive.conn, {
                            type: Types.Answer, username: data.username, data: data.data
                        })
                    }
                    break
                case Types.IceCandidates:
                    if (userToReceive) {
                        sendToConnection(userToReceive.conn, {
                            type: Types.IceCandidates, username: data.username, data: data.data
                        })
                    }
                    break
                case Types.EndCall:
                    if (userToReceive) {
                        sendToConnection(userToReceive.conn, {
                            type: Types.EndCall, username: data.username
                        })
                    }
                    break
            }
        } catch (e) {
            console.log(e.message)
        }
      })
      
      connection.on('close', () => {
            users.forEach(user => {
                if (user.conn === connection) {
                    users.splice(users.indexOf(user), 1)
                }
            })
        })
    })
}


const sendToConnection = (connection, message) => {
    connection.send(JSON.stringify(message))
}

const findUser = username => {
    for (let i = 0; i < users.length; i++) {
        if (users[i].username === username) return users[i]
    }
}


function printHelp() {
  console.log(`Server running. Visit https://localhost:${PORT} in Firefox/Chrome/Safari.\n`);
  console.log('Please note the following:');
  console.log('  * Note the HTTPS in the URL; there is no HTTP -> HTTPS redirect.');
  console.log('  * You\'ll need to accept the invalid TLS certificate as it is self-signed.');
  console.log('  * Some browsers or OSs may not allow the webcam to be used by multiple pages at once. You may need to use two different browsers or machines.');
}

main();